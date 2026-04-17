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
import { api, tokenStore } from '@/lib/api';

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
  /** Accept a client invite — creates Firebase user + syncs profile. */
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
      } catch {
        set({ user: null, firebaseUser, isHydrated: true });
      }
    });
  },
}));
import { create } from 'zustand';
import { tokenStore, api } from '@/lib/api';

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
  isLoading: boolean;
  isHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isHydrated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/login', { email, password });

      await tokenStore.set(res.accessToken, res.refreshToken);
      set({ user: res.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await tokenStore.getRefresh();
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    await tokenStore.clear();
    set({ user: null });
  },

  hydrate: async () => {
    const token = await tokenStore.getAccess();
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const raw = await api.get<
        AuthUser & { orgs?: Array<{ orgId: string; role: AuthUser['role'] }> }
      >('/users/me');

      // Flatten org info to top-level if not already there
      const firstOrg = raw.orgs?.[0];
      const user: AuthUser = {
        ...raw,
        orgId: raw.orgId ?? firstOrg?.orgId ?? '',
        role: raw.role ?? firstOrg?.role ?? 'CLIENT',
      };
      set({ user, isHydrated: true });
    } catch {
      await tokenStore.clear();
      set({ user: null, isHydrated: true });
    }
  },
}));
