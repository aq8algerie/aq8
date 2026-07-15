import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyCM9VzpfxrEDjoJPrm_oS-HLUxc2lBci6o",
  authDomain: "aq8algerie-4f675.firebaseapp.com",
  projectId: "aq8algerie-4f675",
  storageBucket: "aq8algerie-4f675.firebasestorage.app",
  messagingSenderId: "192659281556",
  appId: "1:192659281556:web:89021627a0440277c80681",
  measurementId: "G-0R2CRGZRT9",
};

function envOrDefault(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

const firebaseConfig = {
  apiKey: envOrDefault(import.meta.env.VITE_FIREBASE_API_KEY, defaultFirebaseConfig.apiKey),
  authDomain: envOrDefault(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, defaultFirebaseConfig.authDomain),
  projectId: envOrDefault(import.meta.env.VITE_FIREBASE_PROJECT_ID, defaultFirebaseConfig.projectId),
  storageBucket: envOrDefault(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, defaultFirebaseConfig.storageBucket),
  messagingSenderId: envOrDefault(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, defaultFirebaseConfig.messagingSenderId),
  appId: envOrDefault(import.meta.env.VITE_FIREBASE_APP_ID, defaultFirebaseConfig.appId),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || defaultFirebaseConfig.measurementId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
