// Fleet GPS simulator driven by REAL Karachi route geometry.
// - One simulation per bus (buses are staggered along their route at seed time)
// - BRT corridor speeds 35-55 km/h, slowing to 5 km/h pulling into stops
// - 25-second boarding dwell at every stop
// - 20% peak-hour slowdown (08:00-10:00, 17:00-20:00 server time)
// - Heading computed from actual bearing between GPS positions
import { calculateBearing, haversineDistance } from '../utils/haversine.js';
import {
  SIMULATION_INTERVAL_MS,
  STOP_DWELL_MS,
  BRT_SPEED_RANGE,
  NEAR_STOP_SPEED,
  isPeakHour,
} from '../../data/karachiRealData.js';
import { store } from '../config/dbMode.js';

const rand = (min, max) => min + Math.random() * (max - min);

class GPSSimulator {
  constructor() {
    // routeId -> legacy waypoint walker (socket sim:start with custom coords)
    this.legacySims = new Map();
    // busId -> per-bus fleet sim
    this.fleetSims = new Map();
  }

  /**
   * Legacy entry point kept for the sim:start socket event.
   * Without a custom coordinateArray it delegates to the per-bus fleet engine
   * (first bus on the route, or the specified busId).
   */
  start({ routeId, coordinateArray = null, intervalMs = SIMULATION_INTERVAL_MS, busId = null, tripId = null }, onTick) {
    if (!routeId) throw new Error('routeId is required to start GPS simulation');

    if (coordinateArray && coordinateArray.length > 1) {
      return this.#startLegacyWalker({ routeId, coordinateArray, intervalMs, busId, tripId }, onTick);
    }

    // Fleet-engine path: resolve bus/trip from the store
    const route = store.routes.find((r) => r._id.toString() === routeId.toString());
    if (!route?.waypoints?.length) {
      throw new Error('No waypoints for route — cannot simulate');
    }
    const bus =
      (busId && store.buses.find((b) => b._id.toString() === busId.toString())) ||
      store.buses.find((b) => b.currentRoute?.toString() === routeId.toString());
    if (!bus) throw new Error('No bus assigned to this route');

    return this.startBusSim(store, bus._id, onTick);
  }

  /** Start (or restart) the per-bus simulation seeded from the real dataset. */
  startBusSim(store, busId, onTick) {
    this.stopBus(busId);

    const bus = store.buses.find((b) => b._id.toString() === busId.toString());
    const route = bus && store.routes.find((r) => r._id.toString() === bus.currentRoute?.toString());
    if (!bus || !route?.waypoints?.length) return null;

    const trip =
      store.trips.find(
        (t) => t.busId?.toString() === bus._id.toString() && t.status === 'active'
      ) || null;
    const tripId = trip?._id || `sim-trip-${bus._id}`;

    const waypoints = route.waypoints;
    // Resume from the seeded staggered position
    let segIdx = Math.min(
      Math.floor((bus.simStartWaypointIndex ?? 0) / 2),
      waypoints.length - 2
    );
    if (segIdx < 0) segIdx = 0;
    let progress = 0;
    let dwellUntil = 0;

    const tick = async () => {
      const now = Date.now();

      // Boarding dwell at a stop
      if (now < dwellUntil) {
        const stopWp = waypoints[segIdx];
        await emit({
          lat: stopWp.lat,
          lng: stopWp.lng,
          speed: 0,
          heading: headingAt(segIdx),
          stopName: stopWp.stopName || null,
          atStop: true,
        });
        return;
      }

      const from = waypoints[segIdx];
      const to = waypoints[segIdx + 1];
      const segKm = haversineDistance(from.lat, from.lng, to.lat, to.lng);

      // Speed model: corridor speed, slowing near the stop at the segment end
      let speed;
      if (to.isStop && progress > 0.8) {
        speed = NEAR_STOP_SPEED;
      } else if (progress < 0.12 && from.isStop) {
        speed = NEAR_STOP_SPEED + 8; // pulling away from a stop
      } else {
        speed = rand(BRT_SPEED_RANGE[0], BRT_SPEED_RANGE[1]);
      }
      if (isPeakHour()) speed *= 0.8; // 20% peak congestion

      const stepKm = speed * (SIMULATION_INTERVAL_MS / 3600000);
      progress += segKm > 0 ? stepKm / segKm : 1;

      if (progress >= 1) {
        // Arrived at the next waypoint
        segIdx += 1;
        progress = 0;
        if (segIdx >= waypoints.length - 1) {
          segIdx = 0; // loop the corridor
          progress = 0;
        }
        const arrived = waypoints[segIdx];
        if (arrived.isStop) {
          dwellUntil = now + STOP_DWELL_MS; // 25s boarding time
          await emit({
            lat: arrived.lat,
            lng: arrived.lng,
            speed: 0,
            heading: headingAt(segIdx),
            stopName: arrived.stopName || null,
            atStop: true,
          });
          return;
        }
      }

      const cur = waypoints[segIdx];
      const nxt = waypoints[Math.min(segIdx + 1, waypoints.length - 1)];
      await emit({
        lat: cur.lat + (nxt.lat - cur.lat) * progress,
        lng: cur.lng + (nxt.lng - cur.lng) * progress,
        speed: Math.round(speed),
        heading: headingAt(segIdx),
        stopName: null,
        atStop: false,
      });
    };

    const headingAt = (idx) => {
      const a = waypoints[idx];
      const b = waypoints[Math.min(idx + 1, waypoints.length - 1)];
      return Math.round(calculateBearing(a.lat, a.lng, b.lat, b.lng));
    };

    const emit = async ({ lat, lng, speed, heading, stopName, atStop }) => {
      if (typeof onTick !== 'function') return;
      // Next stop = next stop-flagged waypoint ahead of the bus
      let nextStop = null;
      for (let i = segIdx + 1; i < waypoints.length; i++) {
        if (waypoints[i].isStop) {
          nextStop = waypoints[i].stopName;
          break;
        }
      }
      if (!nextStop) nextStop = waypoints.find((w) => w.isStop)?.stopName || 'Approaching next stop';

      await onTick({
        tripId,
        busId: bus._id,
        routeId: route._id,
        lat,
        lng,
        speed,
        heading,
        stopName: stopName || null,
        nextStop,
        crowdLevel: trip?.crowdLevel || null,
        isSimulated: true,
        timestamp: new Date().toISOString(),
        atStop,
      });
    };

    const timer = setInterval(tick, SIMULATION_INTERVAL_MS);
    this.fleetSims.set(bus._id.toString(), { timer, routeId: route._id, tripId });
    console.log(`[FleetSim] ${bus.busNumber} running on ${route.code} (start waypoint ${Math.floor(segIdx * 2)})`);
    return { busId: bus._id, active: true };
  }

  #startLegacyWalker({ routeId, coordinateArray, intervalMs, busId = null, tripId = null }, onTick) {
    this.stop(routeId);
    const coords = coordinateArray;
    let currentIndex = 0;

    const timer = setInterval(() => {
      const currentPoint = coords[currentIndex];
      const nextIndex = (currentIndex + 1) % coords.length;
      const nextPoint = coords[nextIndex];

      const heading = Math.round(
        calculateBearing(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng)
      );
      const distKm = haversineDistance(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);
      const rawSpeed = (distKm / (intervalMs / 1000)) * 3600;
      const speed = Math.round(Math.min(Math.max(rawSpeed, 20), 55));

      if (typeof onTick === 'function') {
        onTick({
          tripId: tripId || `sim-trip-${routeId}`,
          busId: busId || `sim-bus-${routeId}`,
          routeId,
          lat: currentPoint.lat,
          lng: currentPoint.lng,
          speed,
          heading,
          stopName: currentPoint.stopName || null,
          nextStop: nextPoint.stopName || 'Approaching next stop',
          isSimulated: true,
          timestamp: new Date().toISOString(),
          index: currentIndex,
          totalPoints: coords.length,
        });
      }
      currentIndex = nextIndex;
    }, intervalMs);

    this.legacySims.set(routeId.toString(), { timer, coords, busId, tripId, intervalMs });
    return { routeId, active: true };
  }

  /** Start simulations for every bus in the store. */
  startFleet(store, onTick) {
    let started = 0;
    for (const bus of store.buses) {
      if (this.startBusSim(store, bus._id, onTick)) started++;
    }
    console.log(`[FleetSim] Fleet simulation started: ${started}/${store.buses.length} buses across live corridors.`);
    return started;
  }

  stopBus(busId) {
    const key = busId?.toString();
    const sim = this.fleetSims.get(key);
    if (sim) {
      clearInterval(sim.timer);
      this.fleetSims.delete(key);
      return true;
    }
    return false;
  }

  stop(routeId) {
    let stopped = false;
    const legacy = this.legacySims.get(routeId?.toString());
    if (legacy) {
      clearInterval(legacy.timer);
      this.legacySims.delete(routeId.toString());
      stopped = true;
    }
    for (const [busId, sim] of this.fleetSims.entries()) {
      if (sim.routeId?.toString() === routeId?.toString()) {
        clearInterval(sim.timer);
        this.fleetSims.delete(busId);
        stopped = true;
      }
    }
    return stopped;
  }

  isSimulating(routeId) {
    if (this.legacySims.has(routeId?.toString())) return true;
    for (const sim of this.fleetSims.values()) {
      if (sim.routeId?.toString() === routeId?.toString()) return true;
    }
    return false;
  }

  stopAll() {
    for (const sim of this.legacySims.values()) clearInterval(sim.timer);
    for (const sim of this.fleetSims.values()) clearInterval(sim.timer);
    this.legacySims.clear();
    this.fleetSims.clear();
  }
}

export const gpsSimulator = new GPSSimulator();
export default gpsSimulator;
