import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyCM9VzpfxrEDjoJPrm_oS-HLUxc2lBci6o',
  authDomain: 'aq8algerie-4f675.firebaseapp.com',
  projectId: 'aq8algerie-4f675',
  storageBucket: 'aq8algerie-4f675.firebasestorage.app',
  messagingSenderId: '192659281556',
  appId: '1:192659281556:web:89021627a0440277c80681',
  measurementId: 'G-0R2CRGZRT9'
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId
};

function hasRealValue(value: string) {
  return Boolean(value) && !value.startsWith('YOUR_') && !value.startsWith('MY_');
}

export const isFirebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
].every(hasRealValue);

const app: FirebaseApp | null = isFirebaseConfigured
  ? (getApps()[0] || initializeApp(firebaseConfig))
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

export function requireFirestore(): Firestore {
  if (!db) {
    throw new Error('Firebase Firestore is not configured. Check the embedded AQ8 config or override it with VITE_FIREBASE_* values.');
  }

  return db;
}

export function requireAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Check the embedded AQ8 config or override it with VITE_FIREBASE_* values.');
  }

  return auth;
}

export default app;