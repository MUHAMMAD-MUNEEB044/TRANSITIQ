import { haversineDistance } from './haversine.js';
import Trip from '../models/Trip.js';
import memoryStore from '../models/memoryStore.js';
import mongoose from 'mongoose';

/**
 * Calculates ETA in minutes from bus location to target stop location.
 *
 * @param {Object} busLocation - { lat, lng, speed }
 * @param {Object} targetLocation - { lat, lng }
 * @param {Number} delayMinutes - current recorded delay in minutes
 * @param {String} routeId - associated routeId to compute historical average speed if stationary
 * @returns {Promise<Object>} { etaMinutes, distanceKm, speedUsed, status }
 */
export const calculateETA = async (
  busLocation,
  targetLocation,
  delayMinutes = 0,
  routeId = null
) => {
  const distanceKm = haversineDistance(
    busLocation.lat,
    busLocation.lng,
    targetLocation.lat,
    targetLocation.lng
  );

  let speed = busLocation.speed;

  // If stationary, estimate speed from the route's average across recent trips
  if (!speed || speed <= 2) {
    let historicalSpeed = null;

    try {
      const recentTrips = mongoose.connection.readyState === 1 && routeId
        ? await Trip.find({ routeId, status: 'completed' })
            .sort({ endTime: -1 })
            .limit(5)
            .select('averageSpeed')
        : memoryStore.trips.filter(
            (t) => t.routeId?.toString() === routeId?.toString() && t.status === 'completed' && t.averageSpeed
          ).slice(-5);

      const speeds = recentTrips.map((t) => t.averageSpeed).filter((s) => s > 2);
      if (speeds.length > 0) {
        historicalSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      }
    } catch (e) {
      // Fallback to default below
    }

    speed = historicalSpeed || 25; // Default urban transit speed: 25 km/h
  }

  // Base travel time in minutes
  const travelTimeMinutes = (distanceKm / speed) * 60;
  const totalEtaMinutes = Math.max(1, Math.round(travelTimeMinutes + (delayMinutes || 0)));

  let status = 'ON_TIME';
  if (delayMinutes > 5) {
    status = 'DELAYED';
  }

  return {
    etaMinutes: totalEtaMinutes,
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    speedUsed: Math.round(speed),
    status,
  };
};

export default calculateETA;
