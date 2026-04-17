'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  MessageSquare,
  Activity,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type NotifKind = 'message' | 'workout' | 'alert' | 'system';

const ICONS: Record<NotifKind, typeof Bell> = {
  message: MessageSquare,
  workout: Activity,
  alert: AlertCircle,
  system: Calendar,
};

const COLORS: Record<NotifKind, string> = {
  message: 'bg-info/15 text-info',
  workout: 'bg-success/15 text-success',
  alert: 'bg-warning/15 text-warning',
  system: 'bg-muted text-muted-foreground',
};

function kindFromType(type: string): NotifKind {
  const t = type.toUpperCase();
  if (t.includes('MESSAGE')) return 'message';
  if (t.includes('LOG') || t.includes('WORKOUT')) return 'workout';
  if (t.includes('ALERT') || t.includes('COMPLIANCE') || t.includes('DROP')) return 'alert';
  return 'system';
}

function linkFromData(n: Notification): string | null {
  const d = (n.data as Record<string, string> | undefined) ?? {};
  if (d.clientUserId) return `/clients/${d.clientUserId}`;
  if (d.threadId) return `/messages?threadId=${d.threadId}`;
  return null;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading } = useNotifications({
    unreadOnly: filter === 'unread',
    limit: 50,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  const onClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay on top of client activity and platform updates."
        actions={
          unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Mark all read
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && <Badge variant="default" className="ms-1">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              description={
                filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((n) => {
              const kind = kindFromType(n.type);
              const Icon = ICONS[kind];
              const href = linkFromData(n);
              const read = !!n.readAt;
              const row = (
                <div
                  className={cn(
                    'flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-accent/40',
                    !read && 'bg-primary/[0.03]',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      COLORS[kind],
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          !read ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    )}
                  </div>
                  {!read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              return href ? (
                <Link key={n.id} href={href} onClick={() => onClick(n)} className="block">
                  {row}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onClick(n)}
                  className="block w-full text-start"
                >
                  {row}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
