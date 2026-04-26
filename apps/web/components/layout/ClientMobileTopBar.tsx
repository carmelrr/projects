'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useT } from '@/lib/i18n/client';
import { ClientSidebar } from './ClientSidebar';

export function ClientMobileTopBar() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const { data } = useUnreadCount();
  const unread = data?.count ?? 0;

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('common.openMenu')}>
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="start" className="w-72 p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{t('common.openMenu')}</SheetTitle>
          <ClientSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <OwlLogo variant="lockup" />
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label={t('clientNav.notifications')}
        className="relative"
      >
        <Link href="/client/notifications">
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
