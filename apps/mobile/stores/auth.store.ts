import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api, tokenStore, ApiError } from '@/lib/api';

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
  /** Accept a client invite â€” creates Firebase user + syncs profile. */
  acceptInvite: (input: {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  syncProfile: (firebaseUser: FirebaseUser) => Promise<void>;
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

  acceptInvite: async ({ token, email, password, firstName, lastName }) => {
    set({ isLoading: true });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Backend creates/links the Firestore profile with the invite token
      await api.post('/auth/accept-invite', {
        token,
        firebaseUid: credential.user.uid,
        email,
        firstName,
        lastName,
      });
      await get().syncProfile(credential.user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  sendPasswordReset: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  logout: async () => {
    await signOut(auth);
    await tokenStore.clear();
    set({ user: null, firebaseUser: null });
  },

  syncProfile: async (firebaseUser: FirebaseUser) => {
    const res = await api.post<{
      user: (AuthUser & { orgs?: Array<{ orgId: string; role: AuthUser['role'] }> }) | null;
      isNewUser: boolean;
    }>('/auth/sync', {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
    });

    if (res.isNewUser || !res.user) {
      set({ firebaseUser, user: null, isLoading: false });
      return;
    }

    const raw = res.user;
    const firstOrg = raw.orgs?.[0];
    const user: AuthUser = {
      ...raw,
      orgId: raw.orgId ?? firstOrg?.orgId ?? '',
      role: raw.role ?? firstOrg?.role ?? 'CLIENT',
    };
    set({ user, firebaseUser, isLoading: false });
  },

  hydrate: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, firebaseUser: null, isHydrated: true });
        return;
      }

      try {
        const raw = await api.get<
          AuthUser & { orgs?: Array<{ orgId: string; role: AuthUser['role'] }> }
        >('/users/me');
        const firstOrg = raw.orgs?.[0];
        const user: AuthUser = {
          ...raw,
          orgId: raw.orgId ?? firstOrg?.orgId ?? '',
          role: raw.role ?? firstOrg?.role ?? 'CLIENT',
        };
        set({ user, firebaseUser, isHydrated: true });
      } catch (err) {
        // Only 404 means "profile doesn't exist" (new social login). Any
        // other status (500/network) is a transient backend error and
        // MUST NOT leak into the store as firebaseUser-without-user state,
        // which would bounce the user into the registration flow.
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 404) {
          set({ user: null, firebaseUser, isHydrated: true });
        } else {
          // eslint-disable-next-line no-console
          console.error('[auth] /users/me failed with non-404 status:', status, err);
          set({ user: null, firebaseUser: null, isHydrated: true });
        }
      }
    });
  },
}));
