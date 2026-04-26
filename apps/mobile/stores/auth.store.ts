import { Platform } from 'react-native';
import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { auth } from '@/lib/firebase';
import { api, tokenStore, ApiError } from '@/lib/api';

// Web client ID — used by Google Sign-In on both iOS and Android so that the
// returned ID token is accepted by Firebase Auth.
const WEB_CLIENT_ID =
  '1076962539759-hdflsafusioqetfu2aksl6qh0vdo87o0.apps.googleusercontent.com';

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

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
  /** Accept a client invite — creates Firebase user + syncs profile. */
  acceptInvite: (input: {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  /** Accept invite for a user who already authenticated via Google/Apple. */
  acceptInviteWithCurrentUser: (input: {
    token: string;
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

  loginWithGoogle: async () => {
    configureGoogle();
    set({ isLoading: true });
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // v13 returns { type: 'success' | 'cancelled', data: { idToken } }
      const idToken =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)?.data?.idToken ?? (result as any)?.idToken ?? null;
      if (!idToken) {
        set({ isLoading: false });
        const err = new Error('Sign-in cancelled') as Error & { code?: string };
        err.code = String(statusCodes.SIGN_IN_CANCELLED);
        throw err;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      await get().syncProfile(userCred.user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithApple: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS.');
    }
    set({ isLoading: true });
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error('Apple Sign-In is not available on this device.');
      }
      // Generate nonce for replay-attack protection. Firebase needs the raw
      // nonce; Apple receives it hashed (sha256) inside the ID token.
      const rawNonce = generateNonce(32);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign-In did not return an identity token.');
      }

      const provider = new OAuthProvider('apple.com');
      const oauthCred = provider.credential({
        idToken: credential.identityToken,
        rawNonce,
      });
      const userCred = await signInWithCredential(auth, oauthCred);
      await get().syncProfile(userCred.user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  acceptInvite: async ({ token, email, password, firstName, lastName }) => {
    set({ isLoading: true });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
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

  acceptInviteWithCurrentUser: async ({ token, firstName, lastName }) => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('No active Firebase session.');
    set({ isLoading: true });
    try {
      await api.post('/auth/accept-invite', {
        token,
        firebaseUid: fbUser.uid,
        email: fbUser.email ?? '',
        firstName,
        lastName,
      });
      await get().syncProfile(fbUser);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  sendPasswordReset: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  logout: async () => {
    try {
      configureGoogle();
      await GoogleSignin.signOut().catch(() => {});
    } catch {}
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
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 404) {
          // No profile — try to link/create via /auth/sync (covers fresh
          // social login that hasn't been linked yet).
          try {
            await get().syncProfile(firebaseUser);
            set({ isHydrated: true });
          } catch {
            set({ user: null, firebaseUser, isHydrated: true });
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('[auth] /users/me failed with non-404 status:', status, err);
          set({ user: null, firebaseUser: null, isHydrated: true });
        }
      }
    });
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────

function generateNonce(length: number): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
