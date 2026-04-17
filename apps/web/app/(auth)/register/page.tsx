'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { api, ApiError, tokenStore } from '@/lib/api';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();

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
      router.push(res.user.role === 'CLIENT' ? '/client' : '/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError(t('auth.emailExists'));
        else setError(err.message || t('auth.genericError'));
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.signUpTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t('auth.signUpSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('auth.firstName')}</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={handleChange}
              placeholder={t('auth.firstNamePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('auth.lastName')}</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={handleChange}
              placeholder={t('auth.lastNamePlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgName">{t('auth.orgName')}</Label>
          <Input
            id="orgName"
            name="orgName"
            autoComplete="organization"
            required
            value={form.orgName}
            onChange={handleChange}
            placeholder={t('auth.orgPlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t('common.email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder={t('auth.emailPlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('common.password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
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
          {loading ? t('auth.signUpLoading') : t('auth.signUpCta')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('common.signIn')}
        </Link>
      </p>
    </div>
  );
}

