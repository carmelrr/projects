import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  type AuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
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

/**
 * Try popup first (better UX, no page reload). On environments where popup is
 * blocked or unsupported (Safari ITP, embedded browsers, some 3rd-party-cookie
 * setups), fall back to signInWithRedirect — `getRedirectResult()` in
 * `hydrate()` picks up the result on the next page load.
 */
async function signInWithProvider(provider: AuthProvider): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err instanceof FirebaseError) {
      const fallbackCodes = new Set([
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
      ]);
      if (fallbackCodes.has(err.code)) {
        if (err.code === 'auth/popup-closed-by-user') {
          // User explicitly cancelled — don't fall back to redirect.
          throw err;
        }
        await signInWithRedirect(auth, provider);
        return;
      }
    }
    throw err;
  }
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

