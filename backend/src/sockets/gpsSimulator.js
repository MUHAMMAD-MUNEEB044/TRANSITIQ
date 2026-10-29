import { calculateBearing, haversineDistance } from '../utils/haversine.js';
import { ROUTE_1_COORDS } from '../models/memoryStore.js';

class GPSSimulator {
  constructor() {
    this.activeSimulations = new Map(); // routeId -> { timer, currentIndex, coords, busId, tripId }
  }

  /**
   * Start GPS simulation along a route's waypoints.
   *
   * @param {Object} options
   * @param {string} options.routeId - Target Route ID
   * @param {Array} [options.coordinateArray] - Array of {lat, lng, stopName}
   * @param {number} [options.intervalMs=3000] - Interval in milliseconds between GPS pings
   * @param {string} [options.busId] - Bus ID to simulate
   * @param {string} [options.tripId] - Associated Trip ID
   * @param {Function} onTick - Callback executed on each GPS tick with { tripId, busId, lat, lng, speed, heading, isSimulated, timestamp }
   */
  start({ routeId, coordinateArray = null, intervalMs = 3000, busId = null, tripId = null }, onTick) {
    if (!routeId) throw new Error('routeId is required to start GPS simulation');

    // Stop existing simulation for this route if any
    this.stop(routeId);

    const coords = coordinateArray && coordinateArray.length > 1 ? coordinateArray : ROUTE_1_COORDS;
    let currentIndex = 0;

    console.log(`[GPS Simulator] Starting simulation for route ${routeId} with ${coords.length} waypoints (${intervalMs}ms interval)`);

    const timer = setInterval(() => {
      const currentPoint = coords[currentIndex];
      const nextIndex = (currentIndex + 1) % coords.length;
      const nextPoint = coords[nextIndex];

      // Calculate bearing and distance
      const heading = Math.round(
        calculateBearing(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng)
      );
      const distKm = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        nextPoint.lat,
        nextPoint.lng
      );

      // Estimated speed in km/h: (distKm / (intervalMs / 3600000))
      // Normalized between 25 and 45 km/h for realistic Pakistan city transit
      const rawSpeed = (distKm / (intervalMs / 1000)) * 3600;
      const speed = Math.round(Math.min(Math.max(rawSpeed, 20), 55));

      const payload = {
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
      };

      if (typeof onTick === 'function') {
        onTick(payload);
      }

      currentIndex = nextIndex;
    }, intervalMs);

    this.activeSimulations.set(routeId.toString(), {
      timer,
      currentIndex,
      coords,
      busId,
      tripId,
      intervalMs,
    });

    return { routeId, active: true };
  }

  /**
   * Stop active simulation for a route
   */
  stop(routeId) {
    if (!routeId) return false;
    const sim = this.activeSimulations.get(routeId.toString());
    if (sim) {
      clearInterval(sim.timer);
      this.activeSimulations.delete(routeId.toString());
      console.log(`[GPS Simulator] Stopped simulation for route ${routeId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if a route is currently being simulated
   */
  isSimulating(routeId) {
    return this.activeSimulations.has(routeId?.toString());
  }

  /**
   * Stop all running simulations
   */
  stopAll() {
    for (const [routeId, sim] of this.activeSimulations.entries()) {
      clearInterval(sim.timer);
    }
    this.activeSimulations.clear();
  }
}

export const gpsSimulator = new GPSSimulator();
export default gpsSimulator;
