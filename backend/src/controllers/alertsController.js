import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import { store, useMongo } from '../config/dbMode.js';
import { generateId } from '../models/memoryStore.js';
import { getIO } from '../sockets/broadcaster.js';

export const getActiveAlerts = async (req, res) => {
  try {
    const now = new Date();
    if (useMongo()) {
      const alerts = await Alert.find({ isActive: true, expiresAt: { $gt: now } })
        .populate('routeId', 'routeName colorCode')
        .populate('stopId', 'stopName')
        .populate('publishedBy', 'name role')
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, data: alerts, message: 'Active alerts retrieved', error: null });
    }

    await store.initialize();
    const active = store.alerts
      .filter((a) => a.isActive && new Date(a.expiresAt) > now)
      .map((a) => {
        const route = store.routes.find((r) => r._id.toString() === a.routeId?.toString());
        const stop = store.stops.find((s) => s._id.toString() === a.stopId?.toString());
        const publisher = store.users.find((u) => u._id.toString() === a.publishedBy?.toString());
        return {
          ...a,
          routeId: route ? { _id: route._id, routeName: route.routeName, colorCode: route.colorCode } : null,
          stopId: stop ? { _id: stop._id, stopName: stop.stopName } : null,
          publishedBy: publisher ? { _id: publisher._id, name: publisher.name, role: publisher.role } : null,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, data: active, message: 'Active alerts retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch alerts', error: error.message });
  }
};

export const createAlert = async (req, res) => {
  try {
    const { routeId, stopId, type, message, severity, expiresAt } = req.body;
    const publisherId = req.user ? req.user._id : null;
    const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    let alertData = null;

    if (useMongo()) {
      alertData = await Alert.create({
        routeId: routeId || null,
        stopId: stopId || null,
        type: type || 'announcement',
        message,
        severity: severity || 'info',
        publishedBy: publisherId,
        expiresAt: expiry,
        isActive: true,
      });
    } else {
      await store.initialize();
      alertData = {
        _id: generateId(),
        routeId: routeId || null,
        stopId: stopId || null,
        type: type || 'announcement',
        message,
        severity: severity || 'info',
        publishedBy: publisherId,
        expiresAt: expiry,
        isActive: true,
        createdAt: new Date(),
      };
      store.alerts.unshift(alertData);
    }

    // Broadcast alert via Socket.io to all connected passengers
    try {
      const io = getIO();
      if (io) {
        io.emit('alert:service_broadcast', {
          _id: alertData._id,
          routeId: alertData.routeId,
          type: alertData.type,
          message: alertData.message,
          severity: alertData.severity,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Socket broadcast warning:', e.message);
    }

    return res.status(201).json({ success: true, data: alertData, message: 'Alert published and broadcasted', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to create alert', error: error.message });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;

    if (useMongo()) {
      const deleted = await Alert.findByIdAndUpdate(id, { isActive: false }, { new: true });
      if (!deleted) return res.status(404).json({ success: false, data: null, message: 'Alert not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: { id }, message: 'Alert deactivated', error: null });
    }

    await store.initialize();
    const idx = store.alerts.findIndex((a) => a._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'Alert not found', error: 'NOT_FOUND' });

    store.alerts[idx].isActive = false;
    return res.status(200).json({ success: true, data: { id }, message: 'Alert deactivated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to delete alert', error: error.message });
  }
};
