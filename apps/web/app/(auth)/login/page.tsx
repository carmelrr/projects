'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? t('auth.invalidCredentials') : err.message);
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-eyebrow">{t('brand.short')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.signInTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('common.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('common.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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

        <Button type="submit" disabled={loading} variant="gradient" size="lg" className="w-full">
          {loading ? t('auth.signInLoading') : t('auth.signInCta')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t('common.signUp')}
        </Link>
      </p>
    </div>
  );
}
