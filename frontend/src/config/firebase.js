// Firebase client SDK — initialized only when credentials are present so the
// app still builds/runs without a Firebase project (Google button hides itself).
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app = null;
let auth = null;
export const googleProvider = new GoogleAuthProvider();

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.info('[Firebase] VITE_FIREBASE_* env vars missing — Google Sign-In disabled.');
}

export const getFirebaseAuth = () => auth;
export { signInWithPopup };
