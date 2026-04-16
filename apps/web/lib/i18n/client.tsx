'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, dirOf } from './config';
import type { Dictionary } from './server';

type Ctx = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  dict: Dictionary;
  t: (path: string, vars?: Record<string, string | number>) => string;
  tRaw: <T = unknown>(path: string) => T | undefined;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<Ctx | null>(null);

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const raw = getPath(dict, path);
      if (typeof raw !== 'string') return path;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    },
    [dict],
  );

  const tRaw = useCallback(
    <T,>(path: string) => getPath(dict, path) as T | undefined,
    [dict],
  );

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, dir: dirOf(locale), dict, t, tRaw, setLocale }),
    [locale, dict, t, tRaw, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // SSR-safe fallback so hooks don't crash before mount
    const empty = {} as Dictionary;
    return {
      locale: DEFAULT_LOCALE,
      dir: dirOf(DEFAULT_LOCALE),
      dict: empty,
      t: (p) => p,
      tRaw: () => undefined,
      setLocale: () => {},
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
