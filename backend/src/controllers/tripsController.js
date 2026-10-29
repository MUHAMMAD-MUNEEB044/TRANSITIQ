import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';
import memoryStore, { generateId } from '../models/memoryStore.js';

export const getActiveTrips = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const trips = await Trip.find({ status: { $in: ['active', 'delayed'] } })
        .populate('busId')
        .populate('driverId')
        .populate('routeId');
      return res.status(200).json({ success: true, data: trips, message: 'Active trips retrieved', error: null });
    }

    await memoryStore.initialize();
    const activeTrips = memoryStore.trips
      .filter((t) => t.status === 'active' || t.status === 'delayed')
      .map((t) => {
        const bus = memoryStore.buses.find((b) => b._id.toString() === t.busId?.toString());
        const driver = memoryStore.drivers.find((d) => d._id.toString() === t.driverId?.toString());
        const route = memoryStore.routes.find((r) => r._id.toString() === t.routeId?.toString());
        return { ...t, busId: bus, driverId: driver, routeId: route };
      });

    return res.status(200).json({ success: true, data: activeTrips, message: 'Active trips retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch active trips', error: error.message });
  }
};

export const startTrip = async (req, res) => {
  try {
    const { busId, routeId, driverId, startLat, startLng } = req.body;

    // Use current user's driver ID if driverId not explicitly supplied
    let actualDriverId = driverId;
    if (!actualDriverId && req.user) {
      if (mongoose.connection.readyState === 1) {
        const d = await Driver.findOne({ userId: req.user._id });
        if (d) actualDriverId = d._id;
      } else {
        const d = memoryStore.drivers.find((dr) => dr.userId?.toString() === req.user._id?.toString());
        if (d) actualDriverId = d._id;
      }
    }

    const lat = startLat || 24.8607;
    const lng = startLng || 67.0011;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.create({
        busId,
        driverId: actualDriverId,
        routeId,
        startTime: new Date(),
        currentLocation: { lat, lng, updatedAt: new Date() },
        currentStopIndex: 0,
        delayMinutes: 0,
        status: 'active',
        locationHistory: [{ lat, lng, timestamp: new Date() }],
      });

      // Update Bus & Driver
      await Bus.findByIdAndUpdate(busId, {
        status: 'on_route',
        currentRoute: routeId,
        currentDriver: actualDriverId,
        currentLocation: { lat, lng, speed: 20, heading: 45, updatedAt: new Date() },
      });
      if (actualDriverId) {
        await Driver.findByIdAndUpdate(actualDriverId, {
          status: 'on_trip',
          currentTrip: trip._id,
          assignedBus: busId,
        });
      }

      return res.status(201).json({ success: true, data: trip, message: 'Trip started successfully', error: null });
    }

    await memoryStore.initialize();
    const tripId = generateId();
    const newTrip = {
      _id: tripId,
      busId,
      driverId: actualDriverId,
      routeId,
      startTime: new Date(),
      endTime: null,
      currentLocation: { lat, lng, updatedAt: new Date() },
      currentStopIndex: 0,
      delayMinutes: 0,
      status: 'active',
      locationHistory: [{ lat, lng, timestamp: new Date() }],
      createdAt: new Date(),
    };
    memoryStore.trips.push(newTrip);

    // Update Bus & Driver
    const bIdx = memoryStore.buses.findIndex((b) => b._id.toString() === busId?.toString());
    if (bIdx !== -1) {
      memoryStore.buses[bIdx].status = 'on_route';
      memoryStore.buses[bIdx].currentRoute = routeId;
      memoryStore.buses[bIdx].currentDriver = actualDriverId;
      memoryStore.buses[bIdx].currentLocation = { lat, lng, speed: 20, heading: 45, updatedAt: new Date() };
    }
    const dIdx = memoryStore.drivers.findIndex((d) => d._id.toString() === actualDriverId?.toString());
    if (dIdx !== -1) {
      memoryStore.drivers[dIdx].status = 'on_trip';
      memoryStore.drivers[dIdx].currentTrip = tripId;
      memoryStore.drivers[dIdx].assignedBus = busId;
    }

    return res.status(201).json({ success: true, data: newTrip, message: 'Trip started successfully', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to start trip', error: error.message });
  }
};

export const endTrip = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.findByIdAndUpdate(
        id,
        { status: 'completed', endTime: new Date() },
        { new: true }
      );
      if (!trip) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });

      await Bus.findByIdAndUpdate(trip.busId, { status: 'available' });
      await Driver.findByIdAndUpdate(trip.driverId, {
        status: 'available',
        currentTrip: null,
        $inc: { totalTrips: 1 },
      });

      return res.status(200).json({ success: true, data: trip, message: 'Trip completed successfully', error: null });
    }

    await memoryStore.initialize();
    const idx = memoryStore.trips.findIndex((t) => t._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });

    memoryStore.trips[idx].status = 'completed';
    memoryStore.trips[idx].endTime = new Date();
    const trip = memoryStore.trips[idx];

    const bIdx = memoryStore.buses.findIndex((b) => b._id.toString() === trip.busId?.toString());
    if (bIdx !== -1) memoryStore.buses[bIdx].status = 'available';

    const dIdx = memoryStore.drivers.findIndex((d) => d._id.toString() === trip.driverId?.toString());
    if (dIdx !== -1) {
      memoryStore.drivers[dIdx].status = 'available';
      memoryStore.drivers[dIdx].currentTrip = null;
      memoryStore.drivers[dIdx].totalTrips = (memoryStore.drivers[dIdx].totalTrips || 0) + 1;
    }

    return res.status(200).json({ success: true, data: trip, message: 'Trip completed successfully', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to end trip', error: error.message });
  }
};

export const reportDelay = async (req, res) => {
  try {
    const { id } = req.params;
    const { delayMinutes, reason } = req.body;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.findByIdAndUpdate(
        id,
        {
          delayMinutes: Number(delayMinutes),
          status: Number(delayMinutes) > 0 ? 'delayed' : 'active',
        },
        { new: true }
      );
      if (!trip) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });

      await Bus.findByIdAndUpdate(trip.busId, {
        status: Number(delayMinutes) > 5 ? 'delayed' : 'on_route',
      });

      return res.status(200).json({ success: true, data: { trip, reason }, message: 'Delay reported', error: null });
    }

    await memoryStore.initialize();
    const idx = memoryStore.trips.findIndex((t) => t._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });

    memoryStore.trips[idx].delayMinutes = Number(delayMinutes);
    memoryStore.trips[idx].status = Number(delayMinutes) > 0 ? 'delayed' : 'active';
    const trip = memoryStore.trips[idx];

    const bIdx = memoryStore.buses.findIndex((b) => b._id.toString() === trip.busId?.toString());
    if (bIdx !== -1) {
      memoryStore.buses[bIdx].status = Number(delayMinutes) > 5 ? 'delayed' : 'on_route';
    }

    return res.status(200).json({ success: true, data: { trip, reason }, message: 'Delay reported', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to report delay', error: error.message });
  }
};

export const getTripHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.findById(id).select('locationHistory busId routeId startTime endTime delayMinutes status');
      if (!trip) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: trip, message: 'Trip history retrieved', error: null });
    }

    await memoryStore.initialize();
    const trip = memoryStore.trips.find((t) => t._id.toString() === id.toString());
    if (!trip) return res.status(404).json({ success: false, data: null, message: 'Trip not found', error: 'NOT_FOUND' });

    return res.status(200).json({
      success: true,
      data: {
        _id: trip._id,
        busId: trip.busId,
        routeId: trip.routeId,
        startTime: trip.startTime,
        endTime: trip.endTime,
        delayMinutes: trip.delayMinutes,
        status: trip.status,
        locationHistory: trip.locationHistory || [],
      },
      message: 'Trip history retrieved',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch trip history', error: error.message });
  }
};
