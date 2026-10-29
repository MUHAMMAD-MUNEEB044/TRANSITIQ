import bcrypt from 'bcryptjs';

// Pre-seeded Pakistan routes and coordinates
export const ROUTE_1_COORDS = [
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

export const ROUTE_2_COORDS = [
  { lat: 24.9450, lng: 67.0735, stopName: 'Surjani Town Terminal' },
  { lat: 24.9272, lng: 67.0543, stopName: 'Nagan Chowrangi' },
  { lat: 24.9080, lng: 67.0380, stopName: 'Nazimabad 7' },
  { lat: 24.8885, lng: 67.0305, stopName: 'Gurumandir' },
  { lat: 24.8688, lng: 67.0201, stopName: 'Main Market (Saddar)' }, // Transfer stop
  { lat: 24.8560, lng: 67.0150, stopName: 'M.A. Jinnah Terminal' },
];

// Helper to generate mongo-like hex IDs
export const generateId = () => {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
};

class MemoryDataStore {
  constructor() {
    this.users = [];
    this.drivers = [];
    this.buses = [];
    this.routes = [];
    this.stops = [];
    this.trips = [];
    this.alerts = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Passwords hashed with bcrypt 12 rounds
    const salt = await bcrypt.genSalt(12);
    const passengerHash = await bcrypt.hash('passenger123', salt);
    const driverHash = await bcrypt.hash('driver123', salt);
    const operatorHash = await bcrypt.hash('operator123', salt);
    const adminHash = await bcrypt.hash('admin123', salt);

    const passengerId = generateId();
    const driverUserId = generateId();
    const operatorId = generateId();
    const adminId = generateId();

    this.users = [
      {
        _id: passengerId,
        name: 'Ali Khan',
        email: 'passenger@transitiq.pk',
        passwordHash: passengerHash,
        role: 'passenger',
        refreshToken: null,
        createdAt: new Date(),
      },
      {
        _id: driverUserId,
        name: 'Tariq Mahmood',
        email: 'driver@transitiq.pk',
        passwordHash: driverHash,
        role: 'driver',
        refreshToken: null,
        createdAt: new Date(),
      },
      {
        _id: operatorId,
        name: 'Fatima Zahra',
        email: 'operator@transitiq.pk',
        passwordHash: operatorHash,
        role: 'operator',
        refreshToken: null,
        createdAt: new Date(),
      },
      {
        _id: adminId,
        name: 'TransitIQ Admin',
        email: 'admin@transitiq.pk',
        passwordHash: adminHash,
        role: 'admin',
        refreshToken: null,
        createdAt: new Date(),
      },
    ];

    // Seed Stops
    const route1StopNames = ROUTE_1_COORDS.filter((c) => c.stopName);
    const r1Stops = route1StopNames.map((item, idx) => ({
      _id: generateId(),
      stopName: item.stopName,
      location: {
        type: 'Point',
        coordinates: [item.lng, item.lat],
      },
      routeIds: [],
      stopOrder: idx + 1,
      isActive: true,
      createdAt: new Date(),
    }));

    const route2StopNames = ROUTE_2_COORDS.filter((c) => c.stopName);
    const r2Stops = route2StopNames.map((item, idx) => {
      // Check shared stop (Main Market Saddar)
      const existing = r1Stops.find((s) => s.stopName === item.stopName);
      if (existing) return existing;
      return {
        _id: generateId(),
        stopName: item.stopName,
        location: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
        routeIds: [],
        stopOrder: idx + 1,
        isActive: true,
        createdAt: new Date(),
      };
    });

    this.stops = [...r1Stops];
    r2Stops.forEach((s) => {
      if (!this.stops.some((ex) => ex._id === s._id)) {
        this.stops.push(s);
      }
    });

    // Seed Routes
    const r1Id = generateId();
    const r2Id = generateId();

    const route1 = {
      _id: r1Id,
      routeName: 'R-01 (City Center ↔ University Gate)',
      startLocation: 'City Center (Tower)',
      destination: 'University Gate (KU)',
      stops: r1Stops.map((s, idx) => ({
        stopId: s._id,
        order: idx + 1,
        expectedDuration: (idx + 1) * 6,
      })),
      waypoints: ROUTE_1_COORDS,
      totalDistance: 14.8,
      estimatedDuration: 42,
      isActive: true,
      colorCode: '#38BDF8',
      createdAt: new Date(),
    };

    const route2 = {
      _id: r2Id,
      routeName: 'R-02 (Green Line BRT: Surjani ↔ M.A. Jinnah)',
      startLocation: 'Surjani Town Terminal',
      destination: 'M.A. Jinnah Terminal',
      stops: r2Stops.map((s, idx) => ({
        stopId: s._id,
        order: idx + 1,
        expectedDuration: (idx + 1) * 7,
      })),
      waypoints: ROUTE_2_COORDS,
      totalDistance: 21.5,
      estimatedDuration: 55,
      isActive: true,
      colorCode: '#34D399',
      createdAt: new Date(),
    };

    this.routes = [route1, route2];

    // Link stops to routeIds
    r1Stops.forEach((s) => s.routeIds.push(r1Id));
    r2Stops.forEach((s) => {
      if (!s.routeIds.includes(r2Id)) s.routeIds.push(r2Id);
    });

    // Seed Buses
    const bus1Id = generateId();
    const bus2Id = generateId();
    const bus3Id = generateId();

    const bus1 = {
      _id: bus1Id,
      busNumber: 'PK-BUS-101',
      vehicleNumber: 'KHI-7892',
      capacity: 52,
      currentDriver: null, // linked below
      currentRoute: r1Id,
      currentLocation: {
        lat: ROUTE_1_COORDS[0].lat,
        lng: ROUTE_1_COORDS[0].lng,
        speed: 38,
        heading: 65,
        updatedAt: new Date(),
      },
      status: 'on_route',
      isSimulated: true,
      createdAt: new Date(),
    };

    const bus2 = {
      _id: bus2Id,
      busNumber: 'PK-BUS-204',
      vehicleNumber: 'KHI-4519',
      capacity: 60,
      currentDriver: null,
      currentRoute: r2Id,
      currentLocation: {
        lat: ROUTE_2_COORDS[0].lat,
        lng: ROUTE_2_COORDS[0].lng,
        speed: 42,
        heading: 145,
        updatedAt: new Date(),
      },
      status: 'on_route',
      isSimulated: true,
      createdAt: new Date(),
    };

    const bus3 = {
      _id: bus3Id,
      busNumber: 'PK-BUS-305',
      vehicleNumber: 'KHI-9920',
      capacity: 48,
      currentDriver: null,
      currentRoute: r1Id,
      currentLocation: {
        lat: ROUTE_1_COORDS[4].lat,
        lng: ROUTE_1_COORDS[4].lng,
        speed: 0,
        heading: 70,
        updatedAt: new Date(),
      },
      status: 'delayed',
      isSimulated: false,
      createdAt: new Date(),
    };

    this.buses = [bus1, bus2, bus3];

    // Seed Driver
    const driverProfileId = generateId();
    const driverObj = {
      _id: driverProfileId,
      userId: driverUserId,
      name: 'Tariq Mahmood',
      phone: '+92 300 1234567',
      licenseNumber: 'PK-KHI-DL-88219',
      assignedBus: bus1Id,
      currentTrip: null,
      status: 'on_trip',
      totalTrips: 142,
      createdAt: new Date(),
    };
    this.drivers = [driverObj];
    bus1.currentDriver = driverProfileId;

    // Seed Active Trip
    const tripId = generateId();
    const activeTrip = {
      _id: tripId,
      busId: bus1Id,
      driverId: driverProfileId,
      routeId: r1Id,
      startTime: new Date(Date.now() - 12 * 60 * 1000),
      endTime: null,
      currentLocation: {
        lat: ROUTE_1_COORDS[2].lat,
        lng: ROUTE_1_COORDS[2].lng,
        updatedAt: new Date(),
      },
      currentStopIndex: 1,
      delayMinutes: 0,
      status: 'active',
      locationHistory: ROUTE_1_COORDS.slice(0, 3).map((pt) => ({
        lat: pt.lat,
        lng: pt.lng,
        timestamp: new Date(Date.now() - 4 * 60 * 1000),
      })),
      createdAt: new Date(),
    };
    this.trips = [activeTrip];
    driverObj.currentTrip = tripId;

    // Seed Alerts
    this.alerts = [
      {
        _id: generateId(),
        routeId: r1Id,
        stopId: r1Stops[1]._id,
        type: 'delay',
        message: 'Heavy traffic near Saddar Regent Plaza. Expect 8-10 min delay on R-01.',
        severity: 'warning',
        publishedBy: operatorId,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isActive: true,
        createdAt: new Date(),
      },
      {
        _id: generateId(),
        routeId: r2Id,
        stopId: null,
        type: 'announcement',
        message: 'Green Line BRT operates on high-frequency 4-minute intervals today.',
        severity: 'info',
        publishedBy: operatorId,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        isActive: true,
        createdAt: new Date(),
      },
    ];

    this.initialized = true;
    console.log('[MemoryStore] Initialized successfully with Pakistan Transit live datasets.');
  }
}

export const memoryStore = new MemoryDataStore();
export default memoryStore;
