import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import Driver from '../models/Driver.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Stop from '../models/Stop.js';
import Trip from '../models/Trip.js';
import Alert from '../models/Alert.js';

// Route 1 (Red Line / University Express Corridor - Karachi)
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

// Route 2 (Karachi Green Line Connecting Corridor - Intersects at Main Market / Saddar)
export const ROUTE_2_COORDS = [
  { lat: 24.9450, lng: 67.0735, stopName: 'Surjani Town Terminal' },
  { lat: 24.9272, lng: 67.0543, stopName: 'Nagan Chowrangi' },
  { lat: 24.9080, lng: 67.0380, stopName: 'Nazimabad 7' },
  { lat: 24.8885, lng: 67.0305, stopName: 'Gurumandir' },
  { lat: 24.8688, lng: 67.0201, stopName: 'Main Market (Saddar)' }, // Transfer stop with Route 1!
  { lat: 24.8560, lng: 67.0150, stopName: 'M.A. Jinnah Terminal' },
];

export const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected! Purging old collections...');

    await Promise.all([
      User.deleteMany({}),
      Driver.deleteMany({}),
      Bus.deleteMany({}),
      Route.deleteMany({}),
      Stop.deleteMany({}),
      Trip.deleteMany({}),
      Alert.deleteMany({}),
    ]);

    console.log('Creating demo users...');
    const hashedPassengerPassword = await User.hashPassword('passenger123');
    const hashedDriverPassword = await User.hashPassword('driver123');
    const hashedOperatorPassword = await User.hashPassword('operator123');
    const hashedAdminPassword = await User.hashPassword('admin123');

    const [passengerUser, driverUser, operatorUser, adminUser] = await User.create([
      {
        name: 'Ali Khan',
        email: 'passenger@transitiq.pk',
        passwordHash: hashedPassengerPassword,
        role: 'passenger',
      },
      {
        name: 'Tariq Mahmood',
        email: 'driver@transitiq.pk',
        passwordHash: hashedDriverPassword,
        role: 'driver',
      },
      {
        name: 'Fatima Zahra',
        email: 'operator@transitiq.pk',
        passwordHash: hashedOperatorPassword,
        role: 'operator',
      },
      {
        name: 'TransitIQ Admin',
        email: 'admin@transitiq.pk',
        passwordHash: hashedAdminPassword,
        role: 'admin',
      },
    ]);

    console.log('Creating Stops for Route 1 (University Corridor)...');
    const route1StopData = ROUTE_1_COORDS.filter((c) => c.stopName);
    const route1Stops = [];

    for (let i = 0; i < route1StopData.length; i++) {
      const item = route1StopData[i];
      const stop = await Stop.create({
        stopName: item.stopName,
        location: {
          type: 'Point',
          coordinates: [item.lng, item.lat], // [lng, lat] GeoJSON format
        },
        stopOrder: i + 1,
        isActive: true,
      });
      route1Stops.push(stop);
    }

    console.log('Creating Stops for Route 2 (Green Line Corridor)...');
    const route2StopData = ROUTE_2_COORDS.filter((c) => c.stopName);
    const route2Stops = [];

    for (let i = 0; i < route2StopData.length; i++) {
      const item = route2StopData[i];
      // Check if stop exists already (e.g. Main Market Saddar interchange)
      let stop = route1Stops.find((s) => s.stopName === item.stopName);
      if (!stop) {
        stop = await Stop.create({
          stopName: item.stopName,
          location: {
            type: 'Point',
            coordinates: [item.lng, item.lat],
          },
          stopOrder: i + 1,
          isActive: true,
        });
      }
      route2Stops.push(stop);
    }

    console.log('Creating Routes...');
    const route1 = await Route.create({
      routeName: 'R-01 (Karachi City Center ↔ University Gate)',
      startLocation: 'City Center (Tower)',
      destination: 'University Gate (KU)',
      stops: route1Stops.map((s, idx) => ({
        stopId: s._id,
        order: idx + 1,
        expectedDuration: (idx + 1) * 6,
      })),
      waypoints: ROUTE_1_COORDS,
      totalDistance: 14.8,
      estimatedDuration: 42,
      isActive: true,
      colorCode: '#38BDF8', // Accent Blue
    });

    const route2 = await Route.create({
      routeName: 'R-02 (Karachi Green Line BRT: Surjani ↔ M.A. Jinnah)',
      startLocation: 'Surjani Town Terminal',
      destination: 'M.A. Jinnah Terminal',
      stops: route2Stops.map((s, idx) => ({
        stopId: s._id,
        order: idx + 1,
        expectedDuration: (idx + 1) * 7,
      })),
      waypoints: ROUTE_2_COORDS,
      totalDistance: 21.5,
      estimatedDuration: 55,
      isActive: true,
      colorCode: '#34D399', // Status Green
    });

    // Update stops with their associated route IDs
    await Promise.all([
      ...route1Stops.map((s) =>
        Stop.findByIdAndUpdate(s._id, { $addToSet: { routeIds: route1._id } })
      ),
      ...route2Stops.map((s) =>
        Stop.findByIdAndUpdate(s._id, { $addToSet: { routeIds: route2._id } })
      ),
    ]);

    console.log('Creating Fleet Buses...');
    const bus1 = await Bus.create({
      busNumber: 'PK-BUS-101',
      vehicleNumber: 'KHI-7892',
      capacity: 52,
      currentRoute: route1._id,
      currentLocation: {
        lat: ROUTE_1_COORDS[0].lat,
        lng: ROUTE_1_COORDS[0].lng,
        speed: 38,
        heading: 65,
        updatedAt: new Date(),
      },
      status: 'on_route',
      isSimulated: true,
    });

    const bus2 = await Bus.create({
      busNumber: 'PK-BUS-204',
      vehicleNumber: 'KHI-4519',
      capacity: 60,
      currentRoute: route2._id,
      currentLocation: {
        lat: ROUTE_2_COORDS[0].lat,
        lng: ROUTE_2_COORDS[0].lng,
        speed: 42,
        heading: 145,
        updatedAt: new Date(),
      },
      status: 'on_route',
      isSimulated: true,
    });

    const bus3 = await Bus.create({
      busNumber: 'PK-BUS-305',
      vehicleNumber: 'KHI-9920',
      capacity: 48,
      currentRoute: route1._id,
      currentLocation: {
        lat: ROUTE_1_COORDS[5].lat,
        lng: ROUTE_1_COORDS[5].lng,
        speed: 25,
        heading: 70,
        updatedAt: new Date(),
      },
      status: 'delayed',
      isSimulated: false,
    });

    console.log('Creating Driver Profile...');
    const driver = await Driver.create({
      userId: driverUser._id,
      name: driverUser.name,
      phone: '+92 300 1234567',
      licenseNumber: 'PK-KHI-DL-88219',
      assignedBus: bus1._id,
      status: 'on_trip',
      totalTrips: 142,
    });

    await Bus.findByIdAndUpdate(bus1._id, { currentDriver: driver._id });

    console.log('Creating Active Trip...');
    const activeTrip = await Trip.create({
      busId: bus1._id,
      driverId: driver._id,
      routeId: route1._id,
      startTime: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      currentLocation: {
        lat: ROUTE_1_COORDS[3].lat,
        lng: ROUTE_1_COORDS[3].lng,
        updatedAt: new Date(),
      },
      currentStopIndex: 1,
      delayMinutes: 0,
      status: 'active',
      locationHistory: ROUTE_1_COORDS.slice(0, 4).map((pt) => ({
        lat: pt.lat,
        lng: pt.lng,
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      })),
    });

    await Driver.findByIdAndUpdate(driver._id, { currentTrip: activeTrip._id });

    console.log('Creating Service Alerts...');
    await Alert.create([
      {
        routeId: route1._id,
        stopId: route1Stops[1]._id,
        type: 'delay',
        message: 'Heavy traffic near Saddar Regent Plaza. Expect 8-10 min delay on R-01.',
        severity: 'warning',
        publishedBy: operatorUser._id,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isActive: true,
      },
      {
        routeId: route2._id,
        type: 'announcement',
        message: 'Green Line BRT operates on high-frequency 4-minute intervals today.',
        severity: 'info',
        publishedBy: operatorUser._id,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        isActive: true,
      },
    ]);

    console.log('Database seeded successfully with Pakistan Transit data!');
    console.log('Credentials:');
    console.log('  Passenger: passenger@transitiq.pk / passenger123');
    console.log('  Driver:    driver@transitiq.pk    / driver123');
    console.log('  Operator:  operator@transitiq.pk  / operator123');
    console.log('  Admin:     admin@transitiq.pk     / admin123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

// Execute if run directly
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
