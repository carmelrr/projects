/**
 * API client — wraps fetch with:
 *  • Base URL from env (defaults to localhost:3001)
 *  • Automatic Authorization header injection
 *  • Automatic token refresh on 401
 *  • Response unwrapping from { data: ... } envelope
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ── Token storage ──────────────────────────────────────────
const ACCESS_KEY = 'coaching_access_token';
const REFRESH_KEY = 'coaching_refresh_token';

export const tokenStore = {
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Core fetch wrapper ─────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    const json = await res.json();
    const { accessToken, refreshToken: newRefresh } = json.data;
    tokenStore.set(accessToken, newRefresh);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const access = tokenStore.getAccess();
  if (access) headers['Authorization'] = `Bearer ${access}`;

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && tokenStore.getRefresh()) {
    if (isRefreshing) {
      await new Promise<void>((resolve) => refreshQueue.push(resolve));
    } else {
      isRefreshing = true;
      const ok = await refreshTokens();
      isRefreshing = false;
      refreshQueue.forEach((r) => r());
      refreshQueue = [];

      if (!ok) {
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired');
      }

      // Retry with new token
      headers['Authorization'] = `Bearer ${tokenStore.getAccess()}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errorMessage = errJson.message ?? errorMessage;
    } catch {}
    throw new ApiError(errorMessage, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  // Unwrap { data: ... } envelope
  return 'data' in json ? json.data : json;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Convenience methods ────────────────────────────────────
export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
