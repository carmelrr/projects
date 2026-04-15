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

export const useAuthStore = create<AuthState>((set, get) => ({
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

      tokenStore.set(res.accessToken, res.refreshToken);
      set({ user: res.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.getRefresh() });
    } catch {}
    tokenStore.clear();
    set({ user: null });
  },

  hydrate: async () => {
    const token = tokenStore.getAccess();
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
        role: raw.role ?? firstOrg?.role ?? 'COACH',
      };
      set({ user, isHydrated: true });
    } catch {
      tokenStore.clear();
      set({ user: null, isHydrated: true });
    }
  },
}));
