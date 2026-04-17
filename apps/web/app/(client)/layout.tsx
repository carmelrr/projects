'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const { user, isHydrated, hydrate, logout } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [isHydrated, hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'CLIENT') {
      router.replace('/dashboard');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user || user.role !== 'CLIENT') {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-6">
          <Link href="/client" className="flex items-center gap-2">
            <OwlLogo variant="lockup" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
            <Button variant="ghost" size="sm" onClick={() => logout().then(() => router.push('/login'))}>
              {t('common.signOut')}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
