// Builds store-shaped documents (users, routes, stops, buses, drivers, trips,
// alerts) from the real Karachi dataset. Shared by the in-memory store, the
// MongoDB seed script, and the Firestore seed script so all three modes serve
// identical data.
import bcrypt from 'bcryptjs';
import { generateId } from '../src/models/memoryStoreIds.js';
import { REAL_ROUTES, REAL_BUSES, REAL_DRIVERS } from './karachiRealData.js';

const hash = (plain) => bcrypt.hash(plain, 12);

const midpoint = (a, b) => ({
  lat: (a.lat + b.lat) / 2,
  lng: (a.lng + b.lng) / 2,
});

export const buildSeedDataset = async () => {
  const now = new Date();

  // ── Demo user accounts (unchanged credentials) ──────────────────────────
  const [passengerHash, driverHash, operatorHash, adminHash] = await Promise.all([
    hash('passenger123'),
    hash('driver123'),
    hash('operator123'),
    hash('admin123'),
  ]);

  const passengerId = generateId();
  const driverUserId = generateId();
  const operatorId = generateId();
  const adminId = generateId();

  const users = [
    { _id: passengerId, name: 'Ali Khan', email: 'passenger@transitiq.pk', passwordHash: passengerHash, role: 'passenger', refreshToken: null, favorites: [], createdAt: now },
    { _id: driverUserId, name: 'Ahmed Raza Khan', email: 'driver@transitiq.pk', passwordHash: driverHash, role: 'driver', refreshToken: null, favorites: [], createdAt: now },
    { _id: operatorId, name: 'Fatima Zahra', email: 'operator@transitiq.pk', passwordHash: operatorHash, role: 'operator', refreshToken: null, favorites: [], createdAt: now },
    { _id: adminId, name: 'TransitIQ Admin', email: 'admin@transitiq.pk', passwordHash: adminHash, role: 'admin', refreshToken: null, favorites: [], createdAt: now },
  ];

  // ── Stops & Routes ───────────────────────────────────────────────────────
  const stops = [];
  const routes = [];

  for (const real of REAL_ROUTES) {
    const routeId = generateId();

    const routeStops = real.stops.map((s, idx) => {
      const stop = {
        _id: generateId(),
        stopName: s.stopName,
        location: { type: 'Point', coordinates: [s.lng, s.lat] },
        routeIds: [routeId],
        stopOrder: idx + 1,
        isActive: true,
        createdAt: now,
      };
      stops.push(stop);
      return stop;
    });

    // Waypoints: stops plus a midpoint per segment for smoother GPS movement
    const waypoints = [];
    for (let i = 0; i < real.stops.length; i++) {
      const s = real.stops[i];
      waypoints.push({ lat: s.lat, lng: s.lng, stopName: s.stopName, isStop: true });
      if (i < real.stops.length - 1) {
        const m = midpoint(s, real.stops[i + 1]);
        waypoints.push({ lat: m.lat, lng: m.lng, isStop: false });
      }
    }

    routes.push({
      _id: routeId,
      routeName: real.routeName,
      startLocation: real.startLocation,
      destination: real.destination,
      code: real.code,
      stops: routeStops.map((s, idx) => ({
        stopId: s._id,
        order: idx + 1,
        expectedDuration: Math.round((real.totalDistance / real.stops.length) * (idx + 1)),
      })),
      waypoints,
      totalDistance: real.totalDistance,
      estimatedDuration: real.estimatedDuration,
      frequencyMinutes: real.frequencyMinutes,
      operationalHours: real.operationalHours,
      isActive: true,
      colorCode: real.colorCode,
      createdAt: now,
    });
  }

  // ── Buses (staggered start positions along their route) ─────────────────
  const buses = [];
  const busByNumber = new Map();
  const stopsPerRoute = routes.map((r) => r.stops.length);

  REAL_BUSES.forEach((busDef, i) => {
    const route = routes.find((r) => r.code === busDef.routeCode);
    const routeIdx = routes.indexOf(route);
    const routeBusCount = buses.filter((b) => b.currentRoute === route._id).length;

    // Stagger: 1st bus at stop 1, 2nd at stop 5, 3rd at stop 8 (mod stops)
    const STAGGER = [0, 4, 7, 2, 5];
    const startStopIdx = (routeBusCount + STAGGER[routeBusCount % STAGGER.length]) % stopsPerRoute[routeIdx];
    const wpIdx = startStopIdx * 2; // waypoint index of stop N = 2N (stops + midpoints)
    const wp = route.waypoints[Math.min(wpIdx, route.waypoints.length - 1)];

    const bus = {
      _id: generateId(),
      busNumber: busDef.busNumber,
      vehicleNumber: busDef.vehicleNumber,
      model: busDef.model,
      capacity: busDef.capacity,
      currentDriver: null, // linked below
      currentRoute: route._id,
      currentLocation: {
        lat: wp.lat,
        lng: wp.lng,
        speed: 0,
        heading: 0,
        updatedAt: now,
      },
      simStartWaypointIndex: wpIdx,
      status: 'on_route',
      isSimulated: true,
      createdAt: now,
    };
    buses.push(bus);
    busByNumber.set(bus.busNumber, bus);
  });

  // ── Drivers ──────────────────────────────────────────────────────────────
  const drivers = [];
  for (const d of REAL_DRIVERS) {
    const isDemoDriver = d.name === 'Ahmed Raza Khan';
    const firstBus = d.busNumbers.length > 0 ? busByNumber.get(d.busNumbers[0]) : null;
    const driver = {
      _id: generateId(),
      userId: isDemoDriver ? driverUserId : null,
      name: d.name,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      assignedBus: firstBus ? firstBus._id : null,
      spareBusIds: d.busNumbers.slice(1).map((n) => busByNumber.get(n)?._id).filter(Boolean),
      currentTrip: null,
      status: firstBus ? 'on_trip' : 'off_duty',
      totalTrips: 40 + Math.floor(Math.random() * 160),
      createdAt: now,
    };
    drivers.push(driver);
    if (firstBus) firstBus.currentDriver = driver._id;
  }

  // ── Active trips (one per bus, matching staggered positions) ─────────────
  const trips = [];
  for (const bus of buses) {
    const route = routes.find((r) => r._id === bus.currentRoute);
    const trip = {
      _id: generateId(),
      busId: bus._id,
      driverId: bus.currentDriver,
      routeId: route._id,
      startTime: new Date(now.getTime() - (20 + Math.floor(Math.random() * 40)) * 60 * 1000),
      endTime: null,
      currentLocation: {
        lat: bus.currentLocation.lat,
        lng: bus.currentLocation.lng,
        updatedAt: now,
      },
      currentStopIndex: Math.floor((bus.simStartWaypointIndex || 0) / 2),
      crowdLevel: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
      delayMinutes: 0,
      status: 'active',
      locationHistory: [],
      createdAt: now,
    };
    trips.push(trip);
    const driver = drivers.find((d) => d._id === bus.currentDriver);
    if (driver) driver.currentTrip = trip._id;
  }

  // ── Service alerts (referencing the real corridors) ──────────────────────
  const greenLine = routes.find((r) => r.code === 'R-01');
  const redLine = routes.find((r) => r.code === 'R-02');
  const orangeLine = routes.find((r) => r.code === 'R-03');
  const alerts = [
    {
      _id: generateId(),
      routeId: greenLine._id,
      stopId: null,
      type: 'announcement',
      message: 'Green Line BRT runs every 8 minutes between Surjani Town and Numaish (06:00-23:00).',
      severity: 'info',
      publishedBy: operatorId,
      expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      isActive: true,
      createdAt: now,
    },
    {
      _id: generateId(),
      routeId: redLine._id,
      stopId: null,
      type: 'delay',
      message: 'Red Line BRT: traffic congestion near Malir Halt. Expect 5-8 min delays during evening peak.',
      severity: 'warning',
      publishedBy: operatorId,
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      isActive: true,
      createdAt: now,
    },
    {
      _id: generateId(),
      routeId: orangeLine._id,
      stopId: null,
      type: 'announcement',
      message: 'Orange Line Circular: highest-frequency corridor with a bus every 6 minutes via Clifton.',
      severity: 'info',
      publishedBy: operatorId,
      expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      isActive: true,
      createdAt: now,
    },
  ];

  return { users, routes, stops, buses, drivers, trips, alerts };
};
