'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { api, ApiError, tokenStore } from '@/lib/api';
import type { AuthUser } from '@/stores/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.login);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    orgName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register — API returns tokens + user, same shape as login
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/register', {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        orgName: form.orgName.trim(),
      });

      tokenStore.set(res.accessToken, res.refreshToken);
      useAuthStore.setState({ user: res.user });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email already exists.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Create your account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Dana"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Cohen"
            />
          </div>
        </div>

        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
            Studio / gym name
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            autoComplete="organization"
            required
            value={form.orgName}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Dana Fitness Studio"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="coach@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
