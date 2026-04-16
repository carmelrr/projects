'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { useThreads } from '@/hooks/useMessaging';
import { useT } from '@/lib/i18n/client';
import { Sidebar } from './Sidebar';

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const { data: threads } = useThreads();
  const unread = threads?.reduce((s, th) => s + (th.unreadCount ?? 0), 0) ?? 0;

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('common.openMenu')}>
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="start" className="w-72 p-0">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <OwlLogo variant="lockup" />
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label={t('nav.notifications')}
        className="relative"
      >
        <Link href="/notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <Badge
              variant="default"
              className="absolute -top-0.5 -end-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] tabular-nums"
            >
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Link>
      </Button>
    </header>
  );
}
