import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCM9VzpfxrEDjoJPrm_oS-HLUxc2lBci6o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aq8algerie-4f675.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aq8algerie-4f675",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aq8algerie-4f675.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "192659281556",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:192659281556:web:89021627a0440277c80681",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0R2CRGZRT9"
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