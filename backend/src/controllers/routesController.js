import mongoose from 'mongoose';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Bus from '../models/Bus.js';
import memoryStore, { generateId } from '../models/memoryStore.js';
import { haversineDistance } from '../utils/haversine.js';
import { calculateETA } from '../utils/etaCalculator.js';

export const getAllRoutes = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const routes = await Route.find({ isActive: true }).populate('stops.stopId');
      return res.status(200).json({ success: true, data: routes, message: 'Routes retrieved', error: null });
    }

    await memoryStore.initialize();
    const enrichedRoutes = memoryStore.routes.map((r) => {
      const enrichedStops = r.stops.map((s) => ({
        ...s,
        stopId: memoryStore.stops.find((st) => st._id.toString() === s.stopId?.toString()) || s.stopId,
      }));
      return { ...r, stops: enrichedStops };
    });

    return res.status(200).json({ success: true, data: enrichedRoutes, message: 'Routes retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch routes', error: error.message });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const route = await Route.findById(id).populate('stops.stopId');
      if (!route) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });

      // Fetch active buses on this route
      const activeBuses = await Bus.find({ currentRoute: id });
      return res.status(200).json({ success: true, data: { route, activeBuses }, message: 'Route retrieved', error: null });
    }

    await memoryStore.initialize();
    const route = memoryStore.routes.find((r) => r._id.toString() === id.toString());
    if (!route) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });

    const enrichedStops = route.stops.map((s) => ({
      ...s,
      stopId: memoryStore.stops.find((st) => st._id.toString() === s.stopId?.toString()) || s.stopId,
    }));

    const activeBuses = memoryStore.buses.filter((b) => b.currentRoute?.toString() === id.toString());

    return res.status(200).json({
      success: true,
      data: { route: { ...route, stops: enrichedStops }, activeBuses },
      message: 'Route retrieved',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch route', error: error.message });
  }
};

export const getRouteStopsWithETA = async (req, res) => {
  try {
    const { id } = req.params;
    let route = null;
    let stopsList = [];
    let busesOnRoute = [];

    if (mongoose.connection.readyState === 1) {
      route = await Route.findById(id).populate('stops.stopId');
      if (!route) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });
      busesOnRoute = await Bus.find({ currentRoute: id });
      stopsList = route.stops.map((s) => s.stopId);
    } else {
      await memoryStore.initialize();
      route = memoryStore.routes.find((r) => r._id.toString() === id.toString());
      if (!route) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });
      busesOnRoute = memoryStore.buses.filter((b) => b.currentRoute?.toString() === id.toString());
      stopsList = route.stops.map(
        (s) => memoryStore.stops.find((st) => st._id.toString() === s.stopId?.toString()) || s.stopId
      );
    }

    // Lead bus on route
    const leadBus = busesOnRoute.find((b) => b.status === 'on_route') || busesOnRoute[0];

    // Compute ETA to each stop along the route
    const stopsWithETA = await Promise.all(
      stopsList.filter(Boolean).map(async (stop, idx) => {
        let eta = null;
        if (leadBus && stop.location?.coordinates) {
          const [lng, lat] = stop.location.coordinates;
          eta = await calculateETA(
            leadBus.currentLocation,
            { lat, lng },
            leadBus.status === 'delayed' ? 7 : 0,
            id
          );
        }

        return {
          stop,
          order: idx + 1,
          eta: eta ? eta.etaMinutes : (idx + 1) * 5,
          distanceKm: eta ? eta.distanceKm : (idx + 1) * 2.2,
          status: leadBus?.status || 'on_route',
          approachingBus: leadBus ? leadBus.busNumber : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: { routeId: id, stops: stopsWithETA },
      message: 'Stops with ETA computed',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to compute stops ETA', error: error.message });
  }
};

/**
 * Intelligent Route Search:
 * Finds direct routes and 1-transfer connections across stops in Pakistan.
 */
export const searchRoutes = async (req, res) => {
  try {
    const { from, to, fromLat, fromLng, toLat, toLng } = req.query;

    await memoryStore.initialize();
    let allStops = [];
    let allRoutes = [];
    let allBuses = [];

    if (mongoose.connection.readyState === 1) {
      allStops = await Stop.find({ isActive: true });
      allRoutes = await Route.find({ isActive: true });
      allBuses = await Bus.find();
    } else {
      allStops = memoryStore.stops;
      allRoutes = memoryStore.routes;
      allBuses = memoryStore.buses;
    }

    // Step 1: Identify origin candidate stops
    let fromStops = [];
    if (fromLat && fromLng) {
      const fLat = parseFloat(fromLat);
      const fLng = parseFloat(fromLng);
      fromStops = allStops.filter((s) => {
        const [sLng, sLat] = s.location.coordinates;
        return haversineDistance(fLat, fLng, sLat, sLng) <= 1.5; // Within 1.5km
      });
    } else if (from) {
      const query = from.toLowerCase().trim();
      fromStops = allStops.filter((s) => s.stopName.toLowerCase().includes(query));
    }

    // Step 2: Identify destination candidate stops
    let toStops = [];
    if (toLat && toLng) {
      const tLat = parseFloat(toLat);
      const tLng = parseFloat(toLng);
      toStops = allStops.filter((s) => {
        const [sLng, sLat] = s.location.coordinates;
        return haversineDistance(tLat, tLng, sLat, sLng) <= 1.5;
      });
    } else if (to) {
      const query = to.toLowerCase().trim();
      toStops = allStops.filter((s) => s.stopName.toLowerCase().includes(query));
    }

    // If query string didn't match directly, fall back to matching route start/destination names
    if (fromStops.length === 0 && from) {
      const matchedRoutes = allRoutes.filter((r) => r.startLocation.toLowerCase().includes(from.toLowerCase()));
      if (matchedRoutes.length > 0) {
        fromStops = allStops.filter((s) => matchedRoutes.some((mr) => mr.stops.some((st) => st.stopId.toString() === s._id.toString())));
      }
    }
    if (toStops.length === 0 && to) {
      const matchedRoutes = allRoutes.filter((r) => r.destination.toLowerCase().includes(to.toLowerCase()));
      if (matchedRoutes.length > 0) {
        toStops = allStops.filter((s) => matchedRoutes.some((mr) => mr.stops.some((st) => st.stopId.toString() === s._id.toString())));
      }
    }

    // Step 3: Find Direct Routes
    const directRoutes = [];
    const directRouteIds = new Set();

    for (const route of allRoutes) {
      const stopIdsOnRoute = route.stops.map((s) => s.stopId.toString());

      const matchedFrom = fromStops.find((fs) => stopIdsOnRoute.includes(fs._id.toString()));
      const matchedTo = toStops.find((ts) => stopIdsOnRoute.includes(ts._id.toString()));

      if (matchedFrom && matchedTo) {
        const fromIdx = stopIdsOnRoute.indexOf(matchedFrom._id.toString());
        const toIdx = stopIdsOnRoute.indexOf(matchedTo._id.toString());

        if (fromIdx < toIdx) {
          directRouteIds.add(route._id.toString());
          const busOnRoute = allBuses.find((b) => b.currentRoute?.toString() === route._id.toString());

          let etaData = null;
          if (busOnRoute && matchedFrom.location?.coordinates) {
            const [lng, lat] = matchedFrom.location.coordinates;
            etaData = await calculateETA(busOnRoute.currentLocation, { lat, lng }, 0, route._id);
          }

          directRoutes.push({
            route,
            fromStop: matchedFrom,
            toStop: matchedTo,
            bus: busOnRoute || null,
            nextStop: matchedFrom.stopName,
            etaMinutes: etaData ? etaData.etaMinutes : 6,
            distanceKm: route.totalDistance,
            status: busOnRoute?.status || 'on_route',
            stopsCount: toIdx - fromIdx + 1,
          });
        }
      }
    }

    // Step 4: Transfer routes (if connecting route is needed)
    const transferRoutes = [];
    // Only search transfer if direct routes aren't exhaustive
    for (const r1 of allRoutes) {
      for (const r2 of allRoutes) {
        if (r1._id.toString() === r2._id.toString()) continue;

        const r1StopIds = r1.stops.map((s) => s.stopId.toString());
        const r2StopIds = r2.stops.map((s) => s.stopId.toString());

        const matchedFrom = fromStops.find((fs) => r1StopIds.includes(fs._id.toString()));
        const matchedTo = toStops.find((ts) => r2StopIds.includes(ts._id.toString()));

        if (matchedFrom && matchedTo) {
          // Find intersection stop
          const commonStopId = r1StopIds.find((id) => r2StopIds.includes(id));
          if (commonStopId) {
            const transferStop = allStops.find((s) => s._id.toString() === commonStopId.toString());
            const bus1 = allBuses.find((b) => b.currentRoute?.toString() === r1._id.toString());
            const bus2 = allBuses.find((b) => b.currentRoute?.toString() === r2._id.toString());

            transferRoutes.push({
              leg1: {
                route: r1,
                fromStop: matchedFrom,
                bus: bus1 || null,
                etaMinutes: 5,
              },
              transferStop: transferStop || { stopName: 'Interchange Junction' },
              leg2: {
                route: r2,
                toStop: matchedTo,
                bus: bus2 || null,
                etaMinutes: 14,
              },
              connectionWaitMinutes: 4,
              totalDurationMinutes: (r1.estimatedDuration || 30) / 2 + (r2.estimatedDuration || 35) / 2 + 5,
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        directRoutes,
        transferRoutes,
        query: { from, to, fromLat, fromLng, toLat, toLng },
      },
      message: 'Route search completed',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Route search failed', error: error.message });
  }
};

export const createRoute = async (req, res) => {
  try {
    const { routeName, startLocation, destination, stops, totalDistance, estimatedDuration, colorCode } = req.body;

    if (mongoose.connection.readyState === 1) {
      const newRoute = await Route.create({
        routeName,
        startLocation,
        destination,
        stops: stops || [],
        totalDistance: totalDistance || 10,
        estimatedDuration: estimatedDuration || 30,
        colorCode: colorCode || '#38BDF8',
      });
      return res.status(201).json({ success: true, data: newRoute, message: 'Route created', error: null });
    }

    await memoryStore.initialize();
    const newRoute = {
      _id: generateId(),
      routeName,
      startLocation,
      destination,
      stops: stops || [],
      waypoints: [],
      totalDistance: totalDistance || 10,
      estimatedDuration: estimatedDuration || 30,
      isActive: true,
      colorCode: colorCode || '#38BDF8',
      createdAt: new Date(),
    };
    memoryStore.routes.push(newRoute);

    return res.status(201).json({ success: true, data: newRoute, message: 'Route created', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to create route', error: error.message });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (mongoose.connection.readyState === 1) {
      const updated = await Route.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: updated, message: 'Route updated', error: null });
    }

    await memoryStore.initialize();
    const idx = memoryStore.routes.findIndex((r) => r._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });

    memoryStore.routes[idx] = { ...memoryStore.routes[idx], ...updateData };
    return res.status(200).json({ success: true, data: memoryStore.routes[idx], message: 'Route updated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update route', error: error.message });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const deleted = await Route.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: { id }, message: 'Route deleted', error: null });
    }

    await memoryStore.initialize();
    const idx = memoryStore.routes.findIndex((r) => r._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Route not found', error: 'NOT_FOUND' });

    memoryStore.routes.splice(idx, 1);
    return res.status(200).json({ success: true, data: { id }, message: 'Route deleted', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to delete route', error: error.message });
  }
};
