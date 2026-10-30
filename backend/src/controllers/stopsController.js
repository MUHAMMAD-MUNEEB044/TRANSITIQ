import mongoose from 'mongoose';
import Stop from '../models/Stop.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import { store, useMongo } from '../config/dbMode.js';
import { generateId } from '../models/memoryStore.js';
import { calculateETA } from '../utils/etaCalculator.js';

export const getAllStops = async (req, res) => {
  try {
    if (useMongo()) {
      const stops = await Stop.find({ isActive: true }).populate('routeIds');
      return res.status(200).json({ success: true, data: stops, message: 'Stops retrieved', error: null });
    }

    await store.initialize();
    const enriched = store.stops.map((s) => ({
      ...s,
      routeIds: store.routes.filter((r) => s.routeIds.includes(r._id.toString())),
    }));

    return res.status(200).json({ success: true, data: enriched, message: 'Stops retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch stops', error: error.message });
  }
};

export const getStopById = async (req, res) => {
  try {
    const { id } = req.params;
    let stop = null;
    let routes = [];
    let buses = [];

    if (useMongo()) {
      stop = await Stop.findById(id).populate('routeIds');
      if (!stop) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });

      routes = stop.routeIds || [];
      const routeIds = routes.map((r) => r._id);
      buses = await Bus.find({ currentRoute: { $in: routeIds } });
    } else {
      await store.initialize();
      stop = store.stops.find((s) => s._id.toString() === id.toString());
      if (!stop) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });

      routes = store.routes.filter((r) => stop.routeIds.includes(r._id.toString()));
      buses = store.buses.filter((b) => stop.routeIds.includes(b.currentRoute?.toString()));
    }

    // Compute approaching buses with live ETA for this stop
    const [stopLng, stopLat] = stop.location.coordinates;
    const upcomingBuses = await Promise.all(
      buses.map(async (bus) => {
        const eta = await calculateETA(
          bus.currentLocation,
          { lat: stopLat, lng: stopLng },
          bus.status === 'delayed' ? 6 : 0,
          bus.currentRoute
        );

        const routeObj = routes.find((r) => r._id.toString() === bus.currentRoute?.toString());

        return {
          busId: bus._id,
          busNumber: bus.busNumber,
          vehicleNumber: bus.vehicleNumber,
          route: routeObj ? { id: routeObj._id, name: routeObj.routeName, color: routeObj.colorCode } : null,
          etaMinutes: eta.etaMinutes,
          distanceKm: eta.distanceKm,
          status: bus.status,
          isSimulated: bus.isSimulated,
        };
      })
    );

    // Sort by nearest ETA
    upcomingBuses.sort((a, b) => a.etaMinutes - b.etaMinutes);

    return res.status(200).json({
      success: true,
      data: {
        stop,
        routes,
        upcomingBuses,
      },
      message: 'Stop details and upcoming buses retrieved',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch stop', error: error.message });
  }
};

export const createStop = async (req, res) => {
  try {
    const { stopName, lat, lng, routeIds, stopOrder } = req.body;

    if (useMongo()) {
      const stop = await Stop.create({
        stopName,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        routeIds: routeIds || [],
        stopOrder: stopOrder || 1,
        isActive: true,
      });
      return res.status(201).json({ success: true, data: stop, message: 'Stop created', error: null });
    }

    await store.initialize();
    const newStop = {
      _id: generateId(),
      stopName,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      routeIds: routeIds || [],
      stopOrder: stopOrder || 1,
      isActive: true,
      createdAt: new Date(),
    };
    store.stops.push(newStop);

    return res.status(201).json({ success: true, data: newStop, message: 'Stop created', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to create stop', error: error.message });
  }
};

export const updateStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { stopName, lat, lng, routeIds, stopOrder, isActive } = req.body;

    if (useMongo()) {
      const updatePayload = {};
      if (stopName !== undefined) updatePayload.stopName = stopName;
      if (lat !== undefined && lng !== undefined) {
        updatePayload.location = { type: 'Point', coordinates: [lng, lat] };
      }
      if (routeIds !== undefined) updatePayload.routeIds = routeIds;
      if (stopOrder !== undefined) updatePayload.stopOrder = stopOrder;
      if (isActive !== undefined) updatePayload.isActive = isActive;

      const stop = await Stop.findByIdAndUpdate(id, updatePayload, { new: true });
      if (!stop) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: stop, message: 'Stop updated', error: null });
    }

    await store.initialize();
    const idx = store.stops.findIndex((s) => s._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });

    if (stopName) store.stops[idx].stopName = stopName;
    if (lat !== undefined && lng !== undefined) {
      store.stops[idx].location.coordinates = [lng, lat];
    }
    if (routeIds) store.stops[idx].routeIds = routeIds;
    if (stopOrder !== undefined) store.stops[idx].stopOrder = stopOrder;
    if (isActive !== undefined) store.stops[idx].isActive = isActive;

    return res.status(200).json({ success: true, data: store.stops[idx], message: 'Stop updated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update stop', error: error.message });
  }
};

export const deleteStop = async (req, res) => {
  try {
    const { id } = req.params;

    if (useMongo()) {
      const stop = await Stop.findByIdAndUpdate(id, { isActive: false }, { new: true });
      if (!stop) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });
      // Detach from any routes that reference it
      await Route.updateMany({}, { $pull: { stops: { stopId: id } } });
      return res.status(200).json({ success: true, data: stop, message: 'Stop deactivated', error: null });
    }

    await store.initialize();
    const stop = store.stops.find((s) => s._id.toString() === id.toString());
    if (!stop) return res.status(404).json({ success: false, data: null, message: 'Stop not found', error: 'NOT_FOUND' });

    stop.isActive = false;
    for (const route of store.routes) {
      if (route.stops) route.stops = route.stops.filter((s) => s.stopId?.toString() !== id.toString());
    }

    return res.status(200).json({ success: true, data: stop, message: 'Stop deactivated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to delete stop', error: error.message });
  }
};
