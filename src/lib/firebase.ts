import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyCM9VzpfxrEDjoJPrm_oS-HLUxc2lBci6o",
  authDomain: "aq8algerie-4f675.firebaseapp.com",
  projectId: "aq8algerie-4f675",
  storageBucket: "aq8algerie-4f675.firebasestorage.app",
  messagingSenderId: "192659281556",
  appId: "1:192659281556:web:89021627a0440277c80681",
  measurementId: "G-0R2CRGZRT9",
};

function getEnv(viteName: string, nextName: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[nextName]) {
    return process.env[nextName];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteName]) {
    // @ts-ignore
    return import.meta.env[viteName];
  }
  return undefined;
}

function envOrDefault(viteName: string, nextName: string, fallback: string): string {
  const val = getEnv(viteName, nextName);
  return val?.trim() || fallback;
}

const firebaseConfig = {
  apiKey: envOrDefault("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY", defaultFirebaseConfig.apiKey),
  authDomain: envOrDefault("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", defaultFirebaseConfig.authDomain),
  projectId: envOrDefault("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", defaultFirebaseConfig.projectId),
  storageBucket: envOrDefault("VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", defaultFirebaseConfig.storageBucket),
  messagingSenderId: envOrDefault("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", defaultFirebaseConfig.messagingSenderId),
  appId: envOrDefault("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", defaultFirebaseConfig.appId),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID")?.trim() || defaultFirebaseConfig.measurementId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
