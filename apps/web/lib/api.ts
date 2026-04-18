/**
 * API client - wraps fetch with:
 *  - Base URL from env (defaults to localhost:3001)
 *  - Automatic Firebase ID token injection
 *  - Response unwrapping from { data: ... } envelope
 */

import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function getFirebaseToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = await getFirebaseToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Do NOT hard-redirect when we're already on the login page (e.g. the
    // auth store is bootstrapping via /users/me after a social redirect)
    // — that would cause an infinite reload loop. Let the caller's catch
    // block handle the 401 (auth.store has a /auth/sync fallback for it).
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
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

// Convenience methods
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
