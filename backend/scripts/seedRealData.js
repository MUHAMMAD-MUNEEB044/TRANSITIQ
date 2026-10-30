// Seeds the REAL Karachi transit dataset (5 corridors, 50 stops, 12 buses,
// 10 drivers, 4 demo accounts) — clearing existing data first.
//
//   node scripts/seedRealData.js                 # follows DB_MODE env
//   DB_MODE=mongo node scripts/seedRealData.js   # force MongoDB
//   DB_MODE=firestore node scripts/seedRealData.js
//   DB_MODE=memory node scripts/seedRealData.js
//
import mongoose from 'mongoose';

const mode = (process.env.DB_MODE || 'memory').toLowerCase();
const results = [];

const log = (collection, ok, detail = '') =>
  results.push({ collection, ok, detail }) &&
  console.log(`${ok ? '✓' : '✗'} ${collection}${detail ? ` — ${detail}` : ''}`);

const main = async () => {
  console.log(`[SeedRealData] DB_MODE=${mode}`);

  if (mode === 'firestore') {
    await seedFirestore();
  } else if (mode === 'mongo') {
    await seedMongo();
  } else {
    await seedMemory();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('─'.repeat(52));
  console.log(
    failed.length === 0
      ? `[SeedRealData] All collections seeded successfully (${results.length}/${results.length}).`
      : `[SeedRealData] Finished with ${failed.length} failure(s): ${failed.map((f) => f.collection).join(', ')}`
  );
  process.exit(failed.length === 0 ? 0 : 1);
};

// ── Memory mode ──────────────────────────────────────────────────────────────
async function seedMemory() {
  const { memoryStore } = await import('../src/models/memoryStore.js');
  try {
    await memoryStore.reset();
    log('users', memoryStore.users.length > 0, `${memoryStore.users.length} accounts`);
    log('routes', memoryStore.routes.length >= 5, `${memoryStore.routes.length} corridors`);
    log('stops', memoryStore.stops.length >= 40, `${memoryStore.stops.length} stops`);
    log('buses', memoryStore.buses.length >= 10, `${memoryStore.buses.length} buses`);
    log('drivers', memoryStore.drivers.length >= 10, `${memoryStore.drivers.length} drivers`);
    log('trips', memoryStore.trips.length >= 10, `${memoryStore.trips.length} active trips`);
    log('alerts', memoryStore.alerts.length > 0, `${memoryStore.alerts.length} alerts`);
  } catch (err) {
    log('memory-store', false, err.message);
  }
}

// ── MongoDB mode ─────────────────────────────────────────────────────────────
async function seedMongo() {
  const { connectDB } = await import('../src/config/db.js');
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    log('mongo-connection', false, 'MongoDB unreachable — start mongod and retry.');
    return;
  }

  const dataset = await buildDataset();

  const { default: User } = await import('../src/models/User.js');
  const { default: Route } = await import('../src/models/Route.js');
  const { default: Stop } = await import('../src/models/Stop.js');
  const { default: Bus } = await import('../src/models/Bus.js');
  const { default: Driver } = await import('../src/models/Driver.js');
  const { default: Trip } = await import('../src/models/Trip.js');
  const { default: Alert } = await import('../src/models/Alert.js');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Route.deleteMany({}),
    Stop.deleteMany({}),
    Bus.deleteMany({}),
    Driver.deleteMany({}),
    Trip.deleteMany({}),
    Alert.deleteMany({}),
  ]);
  console.log('[SeedRealData] Cleared existing MongoDB collections.');

  // Insert with ID remapping: the dataset uses random hex ids; remap refs.
  // Users keep their given _id so refresh tokens map correctly.
  await User.insertMany(dataset.users);
  log('users', true, `${dataset.users.length} accounts`);

  const routeDocs = dataset.routes.map(({ _id, simIgnored, ...r }) => ({ ...r, _id }));
  await Route.insertMany(routeDocs);
  log('routes', routeDocs.length >= 5, `${routeDocs.length} corridors`);

  const stopDocs = dataset.stops.map((s) => ({ ...s }));
  await Stop.insertMany(stopDocs);
  log('stops', stopDocs.length >= 40, `${stopDocs.length} stops`);

  const busDocs = dataset.buses.map(({ simStartWaypointIndex, ...b }) => ({ ...b }));
  await Bus.insertMany(busDocs);
  log('buses', busDocs.length >= 10, `${busDocs.length} buses`);

  const driverDocs = dataset.drivers.map(({ spareBusIds, ...d }) => ({ ...d }));
  await Driver.insertMany(driverDocs);
  log('drivers', driverDocs.length >= 10, `${driverDocs.length} drivers`);

  await Trip.insertMany(dataset.trips);
  log('trips', dataset.trips.length >= 10, `${dataset.trips.length} active trips`);

  await Alert.insertMany(dataset.alerts);
  log('alerts', dataset.alerts.length > 0, `${dataset.alerts.length} alerts`);

  await mongoose.disconnect();
}

// ── Firestore mode ───────────────────────────────────────────────────────────
async function seedFirestore() {
  const { getFirestoreDb } = await import('../src/config/firebaseAdmin.js');
  let db;
  try {
    db = await getFirestoreDb();
  } catch (err) {
    log('firestore-connection', false, err.message);
    return;
  }

  const dataset = await buildDataset();
  const collections = ['users', 'routes', 'stops', 'buses', 'drivers', 'trips', 'alerts'];
  const counts = { users: dataset.users, routes: dataset.routes, stops: dataset.stops, buses: dataset.buses, drivers: dataset.drivers, trips: dataset.trips, alerts: dataset.alerts };

  for (const name of collections) {
    try {
      // Clear existing docs
      const existing = await db.collection(name).listDocuments();
      const batch = db.batch();
      for (const doc of existing) batch.delete(doc);
      await batch.commit();

      // Insert real data (doc id = dataset _id)
      const writeBatch = db.batch();
      for (const doc of counts[name]) {
        const { _id, ...data } = doc;
        writeBatch.set(db.collection(name).doc(String(_id)), data);
      }
      await writeBatch.commit();
      log(name, true, `${counts[name].length} docs`);
    } catch (err) {
      log(name, false, err.message);
    }
  }
}

async function buildDataset() {
  const { buildSeedDataset } = await import('../data/buildSeedDataset.js');
  return buildSeedDataset();
}

main().catch((err) => {
  console.error('[SeedRealData] Fatal error:', err);
  process.exit(1);
});
