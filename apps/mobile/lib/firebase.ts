import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCSaWcnV4gXxeAn0YWw961W_JJjvEmmMPs',
  authDomain: 'my-coaching-app-38e46.firebaseapp.com',
  projectId: 'my-coaching-app-38e46',
  storageBucket: 'my-coaching-app-38e46.firebasestorage.app',
  messagingSenderId: '1076962539759',
  appId: '1:1076962539759:web:a52a40bb0cf7a0b459431a',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initializeAuth throws if called twice (e.g. Fast Refresh in dev). Fall back
// to getAuth so the bundle keeps working after HMR.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { app, auth };
