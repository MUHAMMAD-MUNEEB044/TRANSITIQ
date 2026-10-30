// Firebase Admin SDK — initialized lazily so the server still boots when no
// service account is configured (memory/mongo modes keep working untouched).
import fs from 'node:fs';
import path from 'node:path';

let admin = null;
let firestoreDb = null;
let initPromise = null;

const resolveServiceAccount = () => {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  if (!fs.existsSync(abs)) throw new Error(`Service account file not found: ${abs}`);
  return abs;
};

export const getFirebaseAdmin = () => {
  if (admin) return Promise.resolve(admin);
  if (!initPromise) {
    initPromise = (async () => {
      const certPath = resolveServiceAccount();
      if (!certPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set');
      const mod = await import('firebase-admin');
      admin = mod.default ?? mod;
      admin.initializeApp({ credential: admin.credential.cert(certPath) });
      console.log('[FirebaseAdmin] Initialized with service account:', path.basename(certPath));
      return admin;
    })().catch((err) => {
      console.warn('[FirebaseAdmin] Initialization failed:', err.message);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};

export const getFirestoreDb = async () => {
  if (firestoreDb) return firestoreDb;
  const a = await getFirebaseAdmin();
  firestoreDb = a.firestore();
  return firestoreDb;
};

export default getFirebaseAdmin;
