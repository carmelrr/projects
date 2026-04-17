'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

export function MarketingNav() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '#features', label: t('marketing.navFeatures') },
    { href: '#how', label: t('marketing.navHow') },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <OwlLogo variant="lockup" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div className="hidden md:flex md:items-center md:gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/login">{t('marketing.ctaLogin')}</Link>
          </Button>
          <Button asChild variant="gradient" size="sm" className="hidden md:inline-flex">
            <Link href="/register">{t('marketing.ctaStart')}</Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'overflow-hidden border-t border-border/60 transition-[max-height] md:hidden',
          open ? 'max-h-96' : 'max-h-0',
        )}
      >
        <div className="space-y-1 px-4 py-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Button asChild variant="ghost" size="sm" className="flex-1">
              <Link href="/login">{t('marketing.ctaLogin')}</Link>
            </Button>
            <Button asChild variant="gradient" size="sm" className="flex-1">
              <Link href="/register">{t('marketing.ctaStart')}</Link>
            </Button>
          </div>
          <div className="flex items-center gap-1 pt-1">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
