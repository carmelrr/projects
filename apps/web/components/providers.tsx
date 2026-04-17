'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { I18nProvider } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/server';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function Providers({
  children,
  locale,
  dict,
}: {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
}) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} dict={dict}>
        <QueryClientProvider client={queryClient}>
          {isHydrated ? (
            children
          ) : (
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          <Toaster
            richColors
            closeButton
            position={locale === 'he' ? 'bottom-left' : 'bottom-right'}
            theme="system"
          />
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
