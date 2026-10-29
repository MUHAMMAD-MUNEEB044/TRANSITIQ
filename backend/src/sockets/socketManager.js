import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import memoryStore from '../models/memoryStore.js';
import { calculateETA } from '../utils/etaCalculator.js';
import { calculateBearing, haversineDistance } from '../utils/haversine.js';
import { gpsSimulator } from './gpsSimulator.js';

const DRIVER_ROLES = ['driver', 'operator', 'admin'];
const OPERATOR_ROLES = ['operator', 'admin'];
const hasRole = (socket, roles) => roles.includes(socket.user?.role) && !socket.user?.isGuest;

class SocketManager {
  constructor() {
    this.io = null;
    this.lastPingTime = new Map(); // tripId -> timestamp ms
    this.tripRouteMap = new Map(); // tripId -> routeId
    this.busLocationDebounce = new Map(); // busId -> lastDbSaveTime
    this.gpsLossMonitorInterval = null;
  }

  initialize(io) {
    this.io = io;

    // Socket Handshake Authentication Middleware
    this.io.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow unauthenticated passengers to connect for read-only tracking
        socket.user = { role: 'passenger', isGuest: true };
        return next();
      }

      jwt.verify(token, ENV.JWT_SECRET, (err, decoded) => {
        if (err) {
          // Fallback to guest passenger
          socket.user = { role: 'passenger', isGuest: true };
          return next();
        }
        socket.user = decoded;
        next();
      });
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Start GPS Loss Detection Monitor (Checks every 5 seconds)
    this.startGPSLossMonitor();

    console.log('[SocketManager] Real-time TransitIQ engine initialized');
  }

  handleConnection(socket) {
    const userRole = socket.user?.role || 'passenger';
    console.log(`[Socket] Client connected: ${socket.id} (Role: ${userRole})`);

    // PASSENGER / VIEWER ROOM SUBSCRIPTIONS
    socket.on('join_route', ({ routeId }) => {
      if (!routeId) return;
      const room = `route_${routeId}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined ${room}`);
    });

    socket.on('leave_route', ({ routeId }) => {
      if (!routeId) return;
      const room = `route_${routeId}`;
      socket.leave(room);
      console.log(`[Socket] ${socket.id} left ${room}`);
    });

    // DRIVER → SERVER: Start Trip
    socket.on('driver:trip_start', async (data) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      try {
        const { tripId, busId, routeId, driverId } = data;
        if (!tripId || !routeId) return;

        this.lastPingTime.set(tripId.toString(), Date.now());
        this.tripRouteMap.set(tripId.toString(), routeId.toString());

        // Join driver to their route room
        socket.join(`route_${routeId}`);

        console.log(`[Driver] Trip started: trip=${tripId}, bus=${busId}, route=${routeId}`);

        // Notify room
        this.io.to(`route_${routeId}`).emit('passenger:eta_updated', {
          busId,
          routeId,
          status: 'ON_ROUTE',
          message: 'Bus has commenced scheduled run',
        });
      } catch (err) {
        console.error('[Socket] driver:trip_start error:', err);
      }
    });

    // DRIVER → SERVER: Location Update
    socket.on('driver:location_update', async (payload) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      await this.processLocationUpdate(payload);
    });

    // DRIVER → SERVER: Report Delay
    socket.on('driver:report_delay', async ({ tripId, delayMinutes, reason }) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      try {
        console.log(`[Driver] Delay reported for trip ${tripId}: ${delayMinutes} min (${reason})`);
        const routeId = this.tripRouteMap.get(tripId?.toString());

        // Update database / memory store
        if (mongoose.connection.readyState === 1) {
          await Trip.findByIdAndUpdate(tripId, {
            delayMinutes: Number(delayMinutes),
            status: Number(delayMinutes) > 0 ? 'delayed' : 'active',
          });
        } else {
          const trip = memoryStore.trips.find((t) => t._id.toString() === tripId?.toString());
          if (trip) {
            trip.delayMinutes = Number(delayMinutes);
            trip.status = Number(delayMinutes) > 0 ? 'delayed' : 'active';
          }
        }

        // Broadcast to route room or all
        const targetRoom = routeId ? `route_${routeId}` : null;
        const alertData = {
          tripId,
          routeId,
          delayMinutes: Number(delayMinutes),
          reason: reason || 'Heavy traffic congestion',
          timestamp: new Date().toISOString(),
          type: 'delay',
          severity: Number(delayMinutes) > 8 ? 'critical' : 'warning',
          message: `Bus running ${delayMinutes} minutes behind schedule: ${reason || 'Traffic'}`,
        };

        if (targetRoom) {
          this.io.to(targetRoom).emit('passenger:eta_updated', {
            tripId,
            status: 'DELAYED',
            delayMinutes: Number(delayMinutes),
          });
          this.io.to(targetRoom).emit('alert:service_broadcast', alertData);
        } else {
          this.io.emit('alert:service_broadcast', alertData);
        }
      } catch (err) {
        console.error('[Socket] driver:report_delay error:', err);
      }
    });

    // DRIVER → SERVER: Report Issue
    socket.on('driver:report_issue', async ({ tripId, issueType, description }) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      console.log(`[Driver] Vehicle issue reported for trip ${tripId}: ${issueType} - ${description}`);
      const routeId = this.tripRouteMap.get(tripId?.toString());

      this.io.emit('alert:service_broadcast', {
        tripId,
        routeId,
        type: 'closure',
        severity: 'critical',
        message: `Vehicle Service Alert (${issueType}): ${description}`,
        timestamp: new Date().toISOString(),
      });
    });

    // DRIVER → SERVER: End Trip
    socket.on('driver:trip_end', async ({ tripId, busId }) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      try {
        console.log(`[Driver] Trip ended: trip=${tripId}, bus=${busId}`);
        const routeId = this.tripRouteMap.get(tripId?.toString());

        this.lastPingTime.delete(tripId?.toString());
        this.tripRouteMap.delete(tripId?.toString());

        if (routeId) {
          this.io.to(`route_${routeId}`).emit('passenger:trip_ended', {
            busId,
            routeId,
            tripId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('[Socket] driver:trip_end error:', err);
      }
    });

    // OPERATOR → ALL: Service Broadcast
    socket.on('alert:service_broadcast', (alertPayload) => {
      if (!hasRole(socket, OPERATOR_ROLES)) return;
      console.log('[Operator] Broadcasting service bulletin:', alertPayload.message);
      if (alertPayload.routeId) {
        this.io.to(`route_${alertPayload.routeId}`).emit('alert:service_broadcast', alertPayload);
      } else {
        this.io.emit('alert:service_broadcast', alertPayload);
      }
    });

    // OPERATOR → ALL: Stop Closed
    socket.on('alert:stop_closed', (payload) => {
      if (!hasRole(socket, OPERATOR_ROLES)) return;
      this.io.emit('alert:stop_closed', payload);
    });

    // SIMULATION COMMANDS: sim:start & sim:stop
    socket.on('sim:start', ({ routeId, coordinateArray, intervalMs = 3000, busId = null }) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      console.log(`[Sim] Request to start simulation for route ${routeId}`);
      gpsSimulator.start(
        {
          routeId,
          coordinateArray,
          intervalMs,
          busId,
          tripId: `sim-${routeId}`,
        },
        async (tickData) => {
          // Process tick as simulated driver location update
          await this.processLocationUpdate(tickData);

          // Emit sim:tick for UI simulator diagnostics
          socket.emit('sim:tick', {
            index: tickData.index,
            lat: tickData.lat,
            lng: tickData.lng,
            totalPoints: tickData.totalPoints,
            heading: tickData.heading,
            speed: tickData.speed,
          });
        }
      );
    });

    socket.on('sim:stop', ({ routeId } = {}) => {
      if (!hasRole(socket, DRIVER_ROLES)) return;
      if (routeId) {
        gpsSimulator.stop(routeId);
      } else {
        gpsSimulator.stopAll();
      }
      console.log(`[Sim] Simulation halted for route: ${routeId || 'ALL'}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  }

  /**
   * Process driver/simulated location update and broadcast to passengers
   */
  async processLocationUpdate(payload) {
    const { tripId, busId, lat, lng, speed = 30, heading = 0, timestamp, isSimulated = false } = payload;
    if (!lat || !lng) return;

    const now = Date.now();
    let routeId = payload.routeId || this.tripRouteMap.get(tripId?.toString());

    // Update GPS ping tracker
    if (tripId) {
      this.lastPingTime.set(tripId.toString(), now);
      if (routeId) this.tripRouteMap.set(tripId.toString(), routeId.toString());
    }

    // Resolve route and next stop if not directly supplied
    let nextStopName = payload.nextStop || 'Next Stop';
    let nextStopLocation = null;
    let delayMinutes = Number(payload.delayMinutes) || 0;

    // Carry any reported delay from the active trip
    if (tripId && delayMinutes === 0) {
      let trip = null;
      if (mongoose.connection.readyState === 1) {
        trip = await Trip.findById(tripId).select('delayMinutes');
      } else {
        trip = memoryStore.trips.find((t) => t._id.toString() === tripId.toString());
      }
      if (trip?.delayMinutes > 0) delayMinutes = trip.delayMinutes;
    }

    if (routeId) {
      let route = null;
      if (mongoose.connection.readyState === 1) {
        route = await Route.findById(routeId).populate('stops.stopId');
      } else {
        route = memoryStore.routes.find((r) => r._id.toString() === routeId.toString());
      }

      if (route && route.stops?.length > 0) {
        // Pick the nearest stop that lies AHEAD of the bus (bearing within
        // 90° of the heading); fall back to the nearest stop overall.
        const stopCoords = route.stops
          .map((s) => (s.stopId?.location ? s.stopId : null))
          .filter(Boolean)
          .map((s) => ({
            name: s.stopName,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
          }));

        if (stopCoords.length > 0) {
          const angleDiff = (a, b) => {
            const d = Math.abs(a - b) % 360;
            return d > 180 ? 360 - d : d;
          };

          let best = null;
          for (const s of stopCoords) {
            const bearing = calculateBearing(lat, lng, s.lat, s.lng);
            const dist = haversineDistance(lat, lng, s.lat, s.lng);
            const ahead = angleDiff(bearing, heading) < 90;
            if (!best || (ahead && (!best.ahead || dist < best.dist)) || (!best.ahead && ahead) || (!best.ahead && !ahead && dist < best.dist)) {
              best = { ...s, dist, ahead };
            }
          }

          nextStopName = best.name;
          nextStopLocation = { lat: best.lat, lng: best.lng };
        }
      }
    }

    // Calculate dynamic ETA for the next stop
    let calculatedETA = 4;
    let etaStatus = 'ON_TIME';

    if (nextStopLocation) {
      const etaResult = await calculateETA(
        { lat, lng, speed },
        nextStopLocation,
        delayMinutes,
        routeId
      );
      calculatedETA = etaResult.etaMinutes;
      etaStatus = etaResult.status;
    }

    // Debounced database update (every 5 seconds per bus to avoid DB saturation)
    const lastDbSave = this.busLocationDebounce.get(busId?.toString()) || 0;
    if (now - lastDbSave >= 5000 && busId) {
      this.busLocationDebounce.set(busId.toString(), now);
      this.saveBusLocation(busId, tripId, { lat, lng, speed, heading, isSimulated });
    }

    // Broadcast passenger:bus_moved to room "route_<routeId>"
    const movePayload = {
      busId,
      tripId,
      routeId,
      lat,
      lng,
      speed,
      heading,
      eta: calculatedETA + delayMinutes,
      delayMinutes,
      nextStop: nextStopName,
      isSimulated,
      timestamp: timestamp || new Date().toISOString(),
    };

    if (routeId) {
      this.io.to(`route_${routeId}`).emit('passenger:bus_moved', movePayload);
    } else {
      // Global broadcast if no specific route room assigned
      this.io.emit('passenger:bus_moved', movePayload);
    }

    // If delay > 5 min, emit passenger:eta_updated with DELAYED status
    if (delayMinutes > 5 && routeId) {
      this.io.to(`route_${routeId}`).emit('passenger:eta_updated', {
        busId,
        routeId,
        etaMinutes: calculatedETA,
        status: 'DELAYED',
      });
    }
  }

  /**
   * Persist bus location to database or memory store
   */
  async saveBusLocation(busId, tripId, { lat, lng, speed, heading, isSimulated }) {
    try {
      if (mongoose.connection.readyState === 1) {
        await Bus.findByIdAndUpdate(busId, {
          currentLocation: { lat, lng, speed, heading, updatedAt: new Date() },
          status: 'on_route',
          isSimulated,
        });

        if (tripId) {
          await Trip.findByIdAndUpdate(tripId, {
            currentLocation: { lat, lng, updatedAt: new Date() },
            $push: {
              locationHistory: {
                $each: [{ lat, lng, timestamp: new Date() }],
                $slice: -200, // Keep last 200 breadcrumbs
              },
            },
          });
        }
      } else {
        const bus = memoryStore.buses.find((b) => b._id.toString() === busId.toString());
        if (bus) {
          bus.currentLocation = { lat, lng, speed, heading, updatedAt: new Date() };
          bus.status = 'on_route';
          bus.isSimulated = isSimulated;
        }

        if (tripId) {
          const trip = memoryStore.trips.find((t) => t._id.toString() === tripId.toString());
          if (trip) {
            trip.currentLocation = { lat, lng, updatedAt: new Date() };
            if (!trip.locationHistory) trip.locationHistory = [];
            trip.locationHistory.push({ lat, lng, timestamp: new Date() });
            if (trip.locationHistory.length > 200) trip.locationHistory.shift();
          }
        }
      }
    } catch (err) {
      console.warn('[SocketManager] Bus save error:', err.message);
    }
  }

  /**
   * Monitor GPS pings: if now - lastPingTime > 15s → broadcast passenger:gps_lost
   */
  startGPSLossMonitor() {
    if (this.gpsLossMonitorInterval) clearInterval(this.gpsLossMonitorInterval);

    this.gpsLossMonitorInterval = setInterval(async () => {
      const now = Date.now();

      for (const [tripId, lastTime] of this.lastPingTime.entries()) {
        if (now - lastTime > 15000) {
          const routeId = this.tripRouteMap.get(tripId);
          console.warn(`[GPS Monitor] GPS signal lost for trip ${tripId} (Last seen: ${Math.round((now - lastTime) / 1000)}s ago)`);

          const lostPayload = {
            tripId,
            routeId,
            lastSeenAt: new Date(lastTime).toISOString(),
            status: 'GPS_LOST',
            message: 'Location temporarily unavailable',
          };

          // Resolve the bus BEFORE emitting so clients can key GPS-lost state per bus
          if (mongoose.connection.readyState === 1) {
            const trip = await Trip.findById(tripId);
            if (trip?.busId) {
              await Bus.findByIdAndUpdate(trip.busId, { status: 'offline' });
              lostPayload.busId = trip.busId;
            }
          } else {
            const trip = memoryStore.trips.find((t) => t._id.toString() === tripId);
            if (trip?.busId) {
              const bus = memoryStore.buses.find((b) => b._id.toString() === trip.busId.toString());
              if (bus) bus.status = 'offline';
              lostPayload.busId = trip.busId;
            }
          }

          if (routeId) {
            this.io.to(`route_${routeId}`).emit('passenger:gps_lost', lostPayload);
          } else {
            this.io.emit('passenger:gps_lost', lostPayload);
          }

          // Remove to avoid repeated alerts until new ping arrives
          this.lastPingTime.delete(tripId);
        }
      }

      // Prune stale tracker entries so the Maps stay bounded
      const staleCutoff = now - 30 * 60 * 1000;
      for (const [key, time] of this.lastPingTime.entries()) {
        if (time < staleCutoff) this.lastPingTime.delete(key);
      }
      for (const [key, time] of this.busLocationDebounce.entries()) {
        if (time < staleCutoff) this.busLocationDebounce.delete(key);
      }
      for (const [key] of this.tripRouteMap.entries()) {
        if (!this.lastPingTime.has(key)) this.tripRouteMap.delete(key);
      }
    }, 5000);
  }

  destroy() {
    if (this.gpsLossMonitorInterval) {
      clearInterval(this.gpsLossMonitorInterval);
    }
    gpsSimulator.stopAll();
  }
}

export const socketManager = new SocketManager();
export default socketManager;
