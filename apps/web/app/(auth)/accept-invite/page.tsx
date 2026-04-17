'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { api, ApiError, tokenStore } from '@/lib/api';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function postLoginPath(role: AuthUser['role']) {
  return role === 'CLIENT' ? '/client' : '/dashboard';
}

function AcceptInviteInner() {
  const router = useRouter();
  const search = useSearchParams();
  const t = useT();

  const token = search.get('token') ?? '';

  const [form, setForm] = useState({ firstName: '', lastName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const decoded = useMemo(() => {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      return payload as {
        type?: string;
        email?: string;
        role?: string;
        firstName?: string;
        lastName?: string;
      };
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (decoded?.firstName || decoded?.lastName) {
      setForm((prev) => ({
        ...prev,
        firstName: decoded.firstName ?? prev.firstName,
        lastName: decoded.lastName ?? prev.lastName,
      }));
    }
  }, [decoded]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/accept-invite', {
        token,
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      tokenStore.set(res.accessToken, res.refreshToken);
      useAuthStore.setState({ user: res.user, isHydrated: true });
      router.push(postLoginPath(res.user.role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t('auth.genericError'));
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.inviteInvalidTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('auth.inviteInvalidDesc')}</p>
        <Button asChild variant="outline">
          <Link href="/login">{t('common.signIn')}</Link>
        </Button>
      </div>
    );
  }

  const roleLabel =
    decoded?.type === 'coach-invite'
      ? decoded?.role === 'ADMIN_COACH'
        ? t('auth.roleAdminCoach')
        : t('auth.roleCoach')
      : t('auth.roleClient');

  return (
    <div className="w-full">
      <div className="mb-8 space-y-2">
        <p className="text-eyebrow">{roleLabel}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.acceptInviteTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {decoded?.email
            ? t('auth.acceptInviteDescEmail', { email: decoded.email })
            : t('auth.acceptInviteDesc')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('auth.firstName')}</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              placeholder={t('auth.firstNamePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('auth.lastName')}</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              placeholder={t('auth.lastNamePlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('common.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder={t('auth.passwordHint')}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
          {loading ? t('auth.acceptingInvite') : t('auth.acceptInviteCta')}
        </Button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
