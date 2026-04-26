import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  type AuthProvider,
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
  weightUnit?: 'kg' | 'lbs';
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

/**
 * Social sign-in on the web.
 *
 * We use `signInWithRedirect` directly (no popup) because:
 *  - Popups are frequently blocked in production (Vercel + third-party cookie
 *    restrictions, mobile browsers, embedded webviews).
 *  - The popup→redirect fallback we used to have was fragile: some browsers
 *    report `auth/popup-blocked`, others silently close the popup and surface
 *    `auth/popup-closed-by-user`, and in that mixed state users saw a generic
 *    "something went wrong" error instead of actually being redirected.
 *
 * `getRedirectResult()` in `hydrate()` + `onAuthStateChanged` pick up the
 * signed-in user when the browser lands back on the app after the provider
 * flow completes.
 */
async function signInWithProvider(provider: AuthProvider): Promise<void> {
  await signInWithRedirect(auth, provider);
  // Note: `signInWithRedirect` navigates the browser away, so code after this
  // line typically does not execute on success.
}

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
      await signInWithProvider(googleProvider);
      // If popup path completed, onAuthStateChanged in hydrate() will fire and
      // populate the store; explicit syncProfile is also safe here.
      if (auth.currentUser) {
        await get().syncProfile(auth.currentUser);
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true });
    try {
      await signInWithProvider(appleProvider);
      if (auth.currentUser) {
        await get().syncProfile(auth.currentUser);
      }
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
    // Pick up redirect-based sign-in (used as a fallback when popup is blocked).
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

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, firebaseUser: null, isHydrated: true });
        return;
      }

      // Try the authenticated /users/me first.
      try {
        const user = await loadProfile(firebaseUser);
        set({ user, firebaseUser, isHydrated: true });
        return;
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        // eslint-disable-next-line no-console
        console.warn('[auth] /users/me failed, falling back to /auth/sync:', status, err);
      }

      // Fallback to public /auth/sync — handles fresh social logins where the
      // Firestore profile doesn't exist yet (or only exists as a PENDING doc
      // pre-created by a coach invite, in which case sync links by email).
      try {
        await get().syncProfile(firebaseUser);
        set({ isHydrated: true });
        return;
      } catch (syncErr) {
        // eslint-disable-next-line no-console
        console.error('[auth] /auth/sync fallback failed:', syncErr);
        set({ user: null, firebaseUser, isHydrated: true });
      }
    });
  },
}));

