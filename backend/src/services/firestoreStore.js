// Firestore-backed store that mirrors the in-memory store's interface.
// Controllers keep using plain arrays (users, buses, routes, stops, trips,
// alerts, drivers) — this module hydrates them from Firestore on boot and
// syncs snapshots back on a fixed interval, so no controller logic changes.
import memoryStore, { generateId } from '../models/memoryStore.js';
import { getFirestoreDb } from '../config/firebaseAdmin.js';

const COLLECTIONS = ['users', 'buses', 'routes', 'stops', 'trips', 'alerts', 'drivers'];
const SYNC_INTERVAL_MS = 20000;

class FirestoreMirrorStore {
  constructor() {
    // Expose the same live arrays controllers already mutate
    this.users = memoryStore.users;
    this.buses = memoryStore.buses;
    this.routes = memoryStore.routes;
    this.stops = memoryStore.stops;
    this.trips = memoryStore.trips;
    this.alerts = memoryStore.alerts;
    this.drivers = memoryStore.drivers;
    this.initialized = false;
    this.syncTimer = null;
    this.lastSnapshot = new Map(); // collection -> JSON string
    this.available = false;
  }

  async initialize() {
    if (this.initialized) return;
    // Seed the in-memory dataset first (Karachi demo data), then hydrate/merge
    await memoryStore.initialize();

    try {
      const db = await getFirestoreDb();

      // If Firestore already has data, it wins; otherwise push the seed up
      let firestoreHasData = false;
      const usersSnap = await db.collection('users').limit(1).get();
      firestoreHasData = !usersSnap.empty;

      if (firestoreHasData) {
        await this.#hydrate(db);
        console.log('[FirestoreStore] Hydrated existing Firestore data into memory mirror.');
      } else {
        await this.#pushAll(db);
        console.log('[FirestoreStore] Seeded Firestore with Karachi demo dataset.');
      }

      this.available = true;
      this.#startSync(db);
    } catch (err) {
      console.warn(
        '[FirestoreStore] Firestore unavailable, running on in-memory data only:',
        err.message
      );
    }

    this.initialized = true;
  }

  async #hydrate(db) {
    for (const name of COLLECTIONS) {
      const snap = await db.collection(name).get();
      if (snap.empty) continue;
      const docs = snap.docs.map((d) => ({ ...d.data(), _id: d.id }));
      memoryStore[name].length = 0;
      memoryStore[name].push(...docs);
      this.lastSnapshot.set(name, JSON.stringify(docs));
    }
  }

  async #pushAll(db) {
    for (const name of COLLECTIONS) {
      await this.#pushCollection(db, name);
    }
  }

  async #pushCollection(db, name) {
    const docs = memoryStore[name];
    const serialized = JSON.stringify(docs);
    if (this.lastSnapshot.get(name) === serialized) return; // unchanged
    this.lastSnapshot.set(name, serialized);

    const batch = db.batch();
    // Replace the collection contents: delete stale docs, upsert current ones
    const existing = await db.collection(name).listDocuments();
    const keepIds = new Set(docs.map((d) => String(d._id)));
    for (const docRef of existing) {
      if (!keepIds.has(docRef.id)) batch.delete(docRef);
    }
    for (const doc of docs) {
      const { _id, ...data } = doc;
      batch.set(db.collection(name).doc(String(_id)), data, { merge: true });
    }
    await batch.commit();
  }

  #startSync(db) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(async () => {
      try {
        for (const name of COLLECTIONS) {
          await this.#pushCollection(db, name);
        }
      } catch (err) {
        console.warn('[FirestoreStore] Sync failed:', err.message);
      }
    }, SYNC_INTERVAL_MS);
    if (this.syncTimer.unref) this.syncTimer.unref();
  }

  // Best-effort immediate flush (used by auth mutations so a newly created
  // user survives a crash before the next interval tick)
  async persistNow() {
    if (!this.available) return;
    try {
      const db = await getFirestoreDb();
      await this.#pushAll(db);
    } catch (err) {
      console.warn('[FirestoreStore] persistNow failed:', err.message);
    }
  }
}

const firestoreStore = new FirestoreMirrorStore();
export default firestoreStore;
export { generateId };
