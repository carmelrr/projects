'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { useT } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FirebaseError } from 'firebase/app';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFirebaseError(err: unknown) {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return t('auth.invalidCredentials');
        case 'auth/too-many-requests':
          return t('auth.tooManyAttempts');
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          return ''; // user cancelled, no error
        default:
          return t('auth.genericError');
      }
    }
    return t('auth.genericError');
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      const state = useAuthStore.getState();
      if (state.firebaseUser && !state.user) {
        // New user â€” needs registration
        router.push('/register');
      } else {
        const role = state.user?.role;
        router.push(role === 'CLIENT' ? '/client' : '/dashboard');
      }
    } catch (err) {
      const msg = handleFirebaseError(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'apple') {
    setError('');
    setLoading(true);
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
      const state = useAuthStore.getState();
      if (state.firebaseUser && !state.user) {
        router.push('/register');
      } else {
        const role = state.user?.role;
        router.push(role === 'CLIENT' ? '/client' : '/dashboard');
      }
    } catch (err) {
      const msg = handleFirebaseError(err);
      if (msg) setError(msg);
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
        <p className="text-sm text-muted-foreground">{t('auth.signInSubtitleUnified')}</p>
      </div>

      {/* Social login buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={() => handleSocialLogin('google')}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('auth.continueWithGoogle')}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={() => handleSocialLogin('apple')}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          {t('auth.continueWithApple')}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('auth.orWithEmail')}</span>
        </div>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('common.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
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
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
      <p className="text-center text-xs text-muted-foreground">{t('auth.inviteHint')}</p>
    </div>
  );
}
