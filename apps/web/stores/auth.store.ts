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
    // signInWithRedirect). Errors are logged but non-fatal â€” onAuthStateChanged
    // will still fire with the authenticated user if redirect succeeded.
    getRedirectResult(auth).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[auth] getRedirectResult failed:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, firebaseUser: null, isHydrated: true });
        return;
      }

      try {
        // Try to get profile from API
        const raw = await api.get<
          AuthUser & { orgs?: Array<{ orgId: string; role: AuthUser['role'] }> }
        >('/users/me');

        const firstOrg = raw.orgs?.[0];
        const user: AuthUser = {
          ...raw,
          orgId: raw.orgId ?? firstOrg?.orgId ?? '',
          role: raw.role ?? firstOrg?.role ?? 'COACH',
        };
        set({ user, firebaseUser, isHydrated: true });
      } catch (err) {
        // Only treat 404 as "profile does not exist yet" (new social login
        // flow — the UI will send them to /register). For any other status
        // (500 server error, network failure, etc.) we must NOT drop
        // firebaseUser, otherwise the login page redirects the user to
        // /register on every transient backend hiccup.
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 404) {
          set({ user: null, firebaseUser, isHydrated: true });
        } else {
          // eslint-disable-next-line no-console
          console.error('[auth] /users/me failed with non-404 status:', status, err);
          // Preserve firebaseUser so the user stays signed-in at the Firebase
          // layer (they can retry), but clear it from the store so the login
          // page does not auto-redirect to /register. The user can re-attempt
          // sign-in to refresh; a background refetch could be added later.
          set({ user: null, firebaseUser: null, isHydrated: true });
        }
      }
    });
  },
}));