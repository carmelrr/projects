import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  role: 'OWNER' | 'ADMIN_COACH' | 'COACH' | 'CLIENT';
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isHydrated: boolean;

  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  syncProfile: (firebaseUser: FirebaseUser) => Promise<void>;
}

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: false,
  isHydrated: false,

  loginWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await get().syncProfile(credential.user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      // Use redirect flow instead of popup â€” avoids popup-blocker issues in
      // production (Safari ITP, embedded browsers, Vercel preview domains).
      // Result is picked up on next load via getRedirectResult() in hydrate().
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true });
    try {
      await signInWithRedirect(auth, appleProvider);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, firebaseUser: null });
  },

  syncProfile: async (firebaseUser: FirebaseUser) => {
    const res = await api.post<{
      user: AuthUser | null;
      isNewUser: boolean;
    }>('/auth/sync', {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
    });

    if (res.isNewUser || !res.user) {
      // User needs to complete registration
      set({ firebaseUser, user: null, isLoading: false });
      return;
    }

    set({ user: res.user, firebaseUser, isLoading: false });
  },

  hydrate: () => {
    // Surface any pending redirect result (Google/Apple sign-in via
    // signInWithRedirect). Errors are logged but non-fatal — onAuthStateChanged
    // will still fire with the authenticated user if redirect succeeded.
    getRedirectResult(auth).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[auth] getRedirectResult failed:', err);
    });

    const loadProfile = async (
      firebaseUser: FirebaseUser,
    ): Promise<AuthUser | null> => {
      const raw = await api.get<
        AuthUser & { orgs?: Array<{ orgId: string; role: AuthUser['role'] }> }
      >('/users/me');
      const firstOrg = raw.orgs?.[0];
      return {
        ...raw,
        orgId: raw.orgId ?? firstOrg?.orgId ?? '',
        role: raw.role ?? firstOrg?.role ?? 'COACH',
      };
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, firebaseUser: null, isHydrated: true });
        return;
      }

      try {
        const user = await loadProfile(firebaseUser);
        set({ user, firebaseUser, isHydrated: true });
        return;
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;

        // 401 ("User profile not found") is the normal path for a fresh
        // social-login (Google/Apple via signInWithRedirect) where the
        // Firestore profile hasn't been linked yet. Fall back to /auth/sync,
        // which is the public endpoint that creates or links the profile.
        if (status === 401 || status === 404) {
          try {
            await get().syncProfile(firebaseUser);
            // syncProfile already called set() with the right state.
            // If it set user=null + firebaseUser=non-null, the login page
            // routes the user to /register.
            set({ isHydrated: true });
            return;
          } catch (syncErr) {
            // eslint-disable-next-line no-console
            console.error('[auth] /auth/sync fallback failed:', syncErr);
            set({ user: null, firebaseUser, isHydrated: true });
            return;
          }
        }

        // Any other status (500, network, etc.) is a transient backend
        // error. Keep firebaseUser so the user is still signed-in at the
        // Firebase layer (they can retry), but leave user=null and clear
        // firebaseUser from the store so the login page doesn't bounce
        // them into /register on every hiccup.
        // eslint-disable-next-line no-console
        console.error('[auth] /users/me failed:', status, err);
        set({ user: null, firebaseUser: null, isHydrated: true });
      }
    });
  },
}));