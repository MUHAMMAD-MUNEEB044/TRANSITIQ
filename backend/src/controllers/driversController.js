import mongoose from 'mongoose';
import Driver from '../models/Driver.js';
import User from '../models/User.js';
import Bus from '../models/Bus.js';
import { store, useMongo } from '../config/dbMode.js';
import { generateId } from '../models/memoryStore.js';

export const getAllDrivers = async (req, res) => {
  try {
    if (useMongo()) {
      const drivers = await Driver.find().populate('userId', 'name email role').populate('assignedBus').populate('currentTrip');
      return res.status(200).json({ success: true, data: drivers, message: 'Drivers retrieved', error: null });
    }

    await store.initialize();
    const enriched = store.drivers.map((d) => {
      const user = store.users.find((u) => u._id.toString() === d.userId?.toString());
      const assignedBus = store.buses.find((b) => b._id.toString() === d.assignedBus?.toString()) || null;
      const currentTrip = store.trips.find((t) => t._id.toString() === d.currentTrip?.toString()) || null;
      return {
        ...d,
        userId: user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : null,
        assignedBus,
        currentTrip,
      };
    });

    return res.status(200).json({ success: true, data: enriched, message: 'Drivers retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch drivers', error: error.message });
  }
};

export const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    if (useMongo()) {
      const driver = await Driver.findById(id).populate('userId', 'name email role').populate('assignedBus').populate('currentTrip');
      if (!driver) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: driver, message: 'Driver details retrieved', error: null });
    }

    await store.initialize();
    const driver = store.drivers.find((d) => d._id.toString() === id.toString());
    if (!driver) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });

    const user = store.users.find((u) => u._id.toString() === driver.userId?.toString());
    const assignedBus = store.buses.find((b) => b._id.toString() === driver.assignedBus?.toString()) || null;
    const currentTrip = store.trips.find((t) => t._id.toString() === driver.currentTrip?.toString()) || null;

    return res.status(200).json({
      success: true,
      data: {
        ...driver,
        userId: user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : null,
        assignedBus,
        currentTrip,
      },
      message: 'Driver details retrieved',
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch driver', error: error.message });
  }
};

export const createDriver = async (req, res) => {
  try {
    const { userId, name, phone, licenseNumber, assignedBus } = req.body;

    if (useMongo()) {
      const driver = await Driver.create({
        userId,
        name,
        phone,
        licenseNumber,
        assignedBus: assignedBus || null,
        status: 'available',
      });
      return res.status(201).json({ success: true, data: driver, message: 'Driver registered', error: null });
    }

    await store.initialize();
    const newDriver = {
      _id: generateId(),
      userId,
      name,
      phone,
      licenseNumber,
      assignedBus: assignedBus || null,
      currentTrip: null,
      status: 'available',
      totalTrips: 0,
      createdAt: new Date(),
    };
    store.drivers.push(newDriver);

    return res.status(201).json({ success: true, data: newDriver, message: 'Driver registered', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to create driver', error: error.message });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (useMongo()) {
      const updated = await Driver.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });

      // If assignedBus changed, update the bus model as well
      if (updateData.assignedBus) {
        await Bus.findByIdAndUpdate(updateData.assignedBus, { currentDriver: id });
      }
      return res.status(200).json({ success: true, data: updated, message: 'Driver updated', error: null });
    }

    await store.initialize();
    const idx = store.drivers.findIndex((d) => d._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });

    store.drivers[idx] = { ...store.drivers[idx], ...updateData };

    if (updateData.assignedBus) {
      const bIdx = store.buses.findIndex((b) => b._id.toString() === updateData.assignedBus.toString());
      if (bIdx !== -1) store.buses[bIdx].currentDriver = id;
    }

    return res.status(200).json({ success: true, data: store.drivers[idx], message: 'Driver updated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update driver', error: error.message });
  }
};

export const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    if (useMongo()) {
      const deleted = await Driver.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });
      if (deleted.assignedBus) {
        await Bus.findByIdAndUpdate(deleted.assignedBus, { currentDriver: null });
      }
      return res.status(200).json({ success: true, data: null, message: 'Driver removed', error: null });
    }

    await store.initialize();
    const idx = store.drivers.findIndex((d) => d._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Driver not found', error: 'NOT_FOUND' });

    const [removed] = store.drivers.splice(idx, 1);
    if (removed.assignedBus) {
      const bus = store.buses.find((b) => b._id.toString() === removed.assignedBus.toString());
      if (bus) bus.currentDriver = null;
    }

    return res.status(200).json({ success: true, data: null, message: 'Driver removed', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to delete driver', error: error.message });
  }
};
