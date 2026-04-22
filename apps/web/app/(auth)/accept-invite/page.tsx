'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FirebaseError } from 'firebase/app';

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
  const [completed, setCompleted] = useState<{ role: AuthUser['role'] } | null>(null);

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
      const email = decoded?.email ?? '';

      // Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password,
      );

      // Accept invite via API — creates Firestore profile
      const res = await api.post<{ user: AuthUser }>('/auth/accept-invite', {
        token,
        firebaseUid: credential.user.uid,
        email,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });

      useAuthStore.setState({
        user: res.user,
        firebaseUser: credential.user,
        isHydrated: true,
      });

      // For client invites, offer the option to continue in the mobile app
      // (deep link) before redirecting to the web app.
      if (res.user.role === 'CLIENT') {
        setCompleted({ role: res.user.role });
        return;
      }

      router.push(postLoginPath(res.user.role));
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/email-already-in-use') {
          setError(t('auth.emailExists'));
        } else {
          setError(t('auth.genericError'));
        }
      } else if (err instanceof ApiError) {
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

  if (completed) {
    const deepLink = `coaching-app://accept-invite?token=${encodeURIComponent(token)}`;
    return (
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            You&apos;re all set!
          </h1>
          <p className="text-sm text-muted-foreground">
            Open the OP app on your phone to continue, or keep using
            the web dashboard.
          </p>
        </div>
        <div className="space-y-3">
          <Button asChild variant="gradient" size="lg" className="w-full">
            <a href={deepLink}>Open in mobile app</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.push(postLoginPath(completed.role))}
          >
            Continue in browser
          </Button>
        </div>
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
