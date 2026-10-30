import mongoose from 'mongoose';
import memoryStore from '../models/memoryStore.js';
import firestoreStore from '../services/firestoreStore.js';

// Tri-mode persistence: 'firestore' | 'mongo' | 'memory'.
// Defaults to memory when DB_MODE is unset or unrecognized.
export const DB_MODE = (process.env.DB_MODE || 'memory').toLowerCase();

// Mongo branch is used only when mode is mongo/memory-fallback AND a live
// Mongoose connection exists. Firestore mode overrides even a live Mongo.
export const useMongo = () => DB_MODE !== 'firestore' && mongoose.connection.readyState === 1;

// The in-memory-shaped store backing the "else" branches in controllers.
// With DB_MODE=firestore this is a write-through mirror of Firestore.
export const store = DB_MODE === 'firestore' ? firestoreStore : memoryStore;

export const getModeLabel = () => (DB_MODE === 'firestore' ? 'Firestore' : useMongo() ? 'MongoDB' : 'In-Memory');
