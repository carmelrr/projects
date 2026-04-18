import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(requiredEnvVars)
  .filter(([, v]) => !v)
  .map(([k]) => `NEXT_PUBLIC_FIREBASE_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);

if (missing.length > 0) {
  // Fail loudly so the misconfigured deploy is impossible to miss.
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] Missing required env vars:',
    missing.join(', '),
  );
  if (typeof window !== 'undefined') {
    throw new Error(
      `Firebase is misconfigured. Missing: ${missing.join(', ')}`,
    );
  }
}

const firebaseConfig = requiredEnvVars as Record<string, string>;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth };

