import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initialise Firebase lazily. Returns `null` when running on the server
 * without valid credentials (e.g. during `next build` prerendering).
 */
function getFirebaseApp(): FirebaseApp | null {
  // Already initialised?
  if (getApps().length > 0) return getApp();

  // The API key is required — bail out gracefully when it's missing.
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase config is missing NEXT_PUBLIC_FIREBASE_API_KEY. Firebase will not initialize and Auth/Firestore features will be disabled.");
    return null;
  }

  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const suffix = firebaseConfig.apiKey.slice(-6);
    console.info(`Firebase init using API key ending with: ${suffix}`);
  }

  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

/** Firebase Auth instance — may be `null` during SSR/prerender. */
export const auth: Auth = app ? getAuth(app) : (null as unknown as Auth);

/** Firestore instance — may be `null` during SSR/prerender. */
export const db: Firestore = app
  ? getFirestore(app)
  : (null as unknown as Firestore);
