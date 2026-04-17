'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarDays,
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  ChevronsUpDown,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { useT } from '@/lib/i18n/client';
import { useThreads } from '@/hooks/useMessaging';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const t = useT();

  const { data: threads } = useThreads();
  const unreadMessages =
    threads?.reduce((sum, th) => sum + (th.unreadCount ?? 0), 0) ?? 0;
  const { data: unreadNotif } = useUnreadCount();
  const unreadNotifications = unreadNotif?.count ?? 0;

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN_COACH';

  const sections: NavSection[] = [
    {
      key: 'workspace',
      label: t('nav.sections.workspace'),
      items: [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/clients', label: t('nav.clients'), icon: Users },
        { href: '/programs', label: t('nav.programs'), icon: CalendarDays },
        { href: '/exercises', label: t('nav.exercises'), icon: Dumbbell },
      ],
    },
    {
      key: 'engage',
      label: t('nav.sections.engage'),
      items: [
        {
          href: '/messages',
          label: t('nav.messages'),
          icon: MessageSquare,
          badge: unreadMessages,
        },
        {
          href: '/notifications',
          label: t('nav.notifications'),
          icon: Bell,
          badge: unreadNotifications,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            key: 'system',
            label: t('nav.sections.system'),
            items: [{ href: '/admin', label: t('nav.admin'), icon: Shield }],
          },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'OP';

  return (
    <aside className="flex h-full w-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <OwlLogo variant="lockup" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={section.key} className={cn(idx > 0 && 'mt-5')}>
            <p className="text-eyebrow px-3 pb-1.5">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                const showBadge = typeof item.badge === 'number' && item.badge > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-sidebar-primary" />
                    )}
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground',
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <Badge
                        variant={isActive ? 'default' : 'secondary'}
                        className="h-5 min-w-5 justify-center px-1.5 text-[10px] tabular-nums"
                      >
                        {item.badge! > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors',
                'hover:bg-sidebar-accent focus-visible:bg-sidebar-accent outline-none',
              )}
            >
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email}
                </p>
              </div>
              <ChevronsUpDown className="size-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4" /> {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <Bell className="size-4" /> {t('nav.notifications')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" /> {t('common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mt-1 flex items-center justify-end gap-1 px-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </aside>
  );
}