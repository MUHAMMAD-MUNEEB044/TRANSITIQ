import { calculateBearing, haversineDistance } from './haversine.js';

// Default Karachi Route 1 Coordinates for simulation
export const DEFAULT_KARACHI_COORDS = [
  { lat: 24.8607, lng: 67.0011, stopName: 'City Center (Tower)' },
  { lat: 24.8631, lng: 67.0089 },
  { lat: 24.8659, lng: 67.0154 },
  { lat: 24.8688, lng: 67.0201, stopName: 'Main Market (Saddar)' },
  { lat: 24.8712, lng: 67.0248 },
  { lat: 24.8739, lng: 67.0302 },
  { lat: 24.8761, lng: 67.0358, stopName: 'Karachi Cantt Station' },
  { lat: 24.8783, lng: 67.0412 },
  { lat: 24.8801, lng: 67.0467 },
  { lat: 24.8819, lng: 67.0521, stopName: 'Civil Lines' },
  { lat: 24.8837, lng: 67.0578 },
  { lat: 24.8856, lng: 67.0634, stopName: 'University Gate (KU)' },
];

/**
 * Starts continuous GPS waypoint cycle simulation.
 *
 * @param {Array} coordinateArray
 * @param {Function} emitFn - (lat, lng, speed, heading, meta) => void
 * @param {number} [intervalMs=3000]
 * @returns {{ stop: Function }}
 */
export const startSimulation = (coordinateArray = null, emitFn, intervalMs = 3000) => {
  const coords = coordinateArray && coordinateArray.length > 1 ? coordinateArray : DEFAULT_KARACHI_COORDS;
  let currentIndex = 0;

  const intervalId = setInterval(() => {
    const currentPoint = coords[currentIndex];
    const nextIndex = (currentIndex + 1) % coords.length;
    const nextPoint = coords[nextIndex];

    const heading = Math.round(
      calculateBearing(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng)
    );
    const distKm = haversineDistance(
      currentPoint.lat,
      currentPoint.lng,
      nextPoint.lat,
      nextPoint.lng
    );

    // Calculate speed in km/h normalized for city traffic
    const rawSpeed = (distKm / (intervalMs / 1000)) * 3600;
    const speed = Math.round(Math.min(Math.max(rawSpeed, 22), 52));

    if (typeof emitFn === 'function') {
      emitFn(currentPoint.lat, currentPoint.lng, speed, heading, {
        stopName: currentPoint.stopName || null,
        nextStop: nextPoint.stopName || 'Approaching Stop',
        index: currentIndex,
        total: coords.length,
      });
    }

    currentIndex = nextIndex;
  }, intervalMs);

  return {
    stop: () => {
      clearInterval(intervalId);
    },
  };
};

export default startSimulation;
