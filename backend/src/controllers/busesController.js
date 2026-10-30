import mongoose from 'mongoose';
import Bus from '../models/Bus.js';
import { store, useMongo } from '../config/dbMode.js';
import { generateId } from '../models/memoryStore.js';

export const getAllBuses = async (req, res) => {
  try {
    if (useMongo()) {
      const buses = await Bus.find().populate('currentDriver').populate('currentRoute');
      return res.status(200).json({ success: true, data: buses, message: 'Buses fetched', error: null });
    }

    await store.initialize();
    const enrichedBuses = store.buses.map((b) => {
      const currentDriver = store.drivers.find((d) => d._id.toString() === b.currentDriver?.toString()) || null;
      const currentRoute = store.routes.find((r) => r._id.toString() === b.currentRoute?.toString()) || null;
      return { ...b, currentDriver, currentRoute };
    });

    return res.status(200).json({ success: true, data: enrichedBuses, message: 'Buses fetched', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch buses', error: error.message });
  }
};

export const getBusById = async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongo()) {
      const bus = await Bus.findById(id).populate('currentDriver').populate('currentRoute');
      if (!bus) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: bus, message: 'Bus details retrieved', error: null });
    }

    await store.initialize();
    const bus = store.buses.find((b) => b._id.toString() === id.toString());
    if (!bus) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });

    const currentDriver = store.drivers.find((d) => d._id.toString() === bus.currentDriver?.toString()) || null;
    const currentRoute = store.routes.find((r) => r._id.toString() === bus.currentRoute?.toString()) || null;

    return res.status(200).json({ success: true, data: { ...bus, currentDriver, currentRoute }, message: 'Bus details retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch bus', error: error.message });
  }
};

export const createBus = async (req, res) => {
  try {
    const { busNumber, vehicleNumber, capacity, currentRoute, status } = req.body;

    if (useMongo()) {
      const newBus = await Bus.create({
        busNumber,
        vehicleNumber,
        capacity: capacity || 45,
        currentRoute: currentRoute || null,
        status: status || 'available',
      });
      return res.status(201).json({ success: true, data: newBus, message: 'Bus created successfully', error: null });
    }

    await store.initialize();
    const newBus = {
      _id: generateId(),
      busNumber,
      vehicleNumber,
      capacity: capacity || 45,
      currentDriver: null,
      currentRoute: currentRoute || null,
      currentLocation: { lat: 24.8607, lng: 67.0011, speed: 0, heading: 0, updatedAt: new Date() },
      status: status || 'available',
      isSimulated: false,
      createdAt: new Date(),
    };
    store.buses.push(newBus);

    return res.status(201).json({ success: true, data: newBus, message: 'Bus created successfully', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to create bus', error: error.message });
  }
};

export const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (useMongo()) {
      const bus = await Bus.findByIdAndUpdate(id, updateData, { new: true });
      if (!bus) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: bus, message: 'Bus updated successfully', error: null });
    }

    await store.initialize();
    const idx = store.buses.findIndex((b) => b._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });

    store.buses[idx] = { ...store.buses[idx], ...updateData, updatedAt: new Date() };
    return res.status(200).json({ success: true, data: store.buses[idx], message: 'Bus updated successfully', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update bus', error: error.message });
  }
};

export const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;

    if (useMongo()) {
      const bus = await Bus.findByIdAndDelete(id);
      if (!bus) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: { id }, message: 'Bus deleted successfully', error: null });
    }

    await store.initialize();
    const idx = store.buses.findIndex((b) => b._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Bus not found', error: 'NOT_FOUND' });

    store.buses.splice(idx, 1);
    return res.status(200).json({ success: true, data: { id }, message: 'Bus deleted successfully', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to delete bus', error: error.message });
  }
};
