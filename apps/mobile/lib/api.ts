import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const ACCESS_KEY = 'coaching_access_token';
const REFRESH_KEY = 'coaching_refresh_token';

// ── Token store ────────────────────────────────────────────────────────────

export const tokenStore = {
  async getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async set(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

// ── Error class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Refresh lock ───────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await tokenStore.clear();
    return null;
  }

  const json = await res.json();
  const data = json.data ?? json;
  await tokenStore.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

// ── Core fetch ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const accessToken = await tokenStore.getAccess();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 with token refresh
  if (res.status === 401 && accessToken) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push(async (newToken) => {
          if (!newToken) {
            reject(new ApiError('Session expired', 401));
            return;
          }
          try {
            resolve(await request<T>(method, path, body));
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;

    const queue = refreshQueue;
    refreshQueue = [];
    queue.forEach((cb) => cb(newToken));

    if (!newToken) throw new ApiError('Session expired', 401);

    // Retry original request
    return request<T>(method, path, body);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      message = errJson.message ?? errJson.error ?? message;
    } catch {}
    throw new ApiError(message, res.status);
  }

  // Handle 204 no content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  // Unwrap { data: ... } envelope
  return (json.data !== undefined ? json.data : json) as T;
}

// ── Public API ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
