'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { BrandWatermark } from '@/components/brand/BrandWatermark';
import { useAuthStore } from '@/stores/auth.store';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'CLIENT') {
      router.replace('/client');
    }
  }, [user, isHydrated, router]);

  if (!isHydrated || !user || user.role === 'CLIENT') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background lg:flex-row">
      <BrandWatermark />
      <MobileTopBar />
      <div className="relative z-[2] hidden lg:block lg:w-64 lg:shrink-0">
        <Sidebar />
      </div>
      <main className="relative z-[2] flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
