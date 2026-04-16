'use client';

import { useState } from 'react';
import { Bell, Check, MessageSquare, Activity, AlertCircle, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NotifKind = 'message' | 'workout' | 'alert' | 'system';

interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

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

// Placeholder data — to be wired to /notifications endpoint
const SAMPLE: Notif[] = [
  {
    id: '1',
    kind: 'message',
    title: 'New message from Sarah Cohen',
    body: '"Hey coach, finished today\'s session. Felt strong on squats!"',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    read: false,
  },
  {
    id: '2',
    kind: 'workout',
    title: 'David Levi completed Workout B',
    body: 'Logged 4 sets, RPE 8.5',
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    read: false,
  },
  {
    id: '3',
    kind: 'alert',
    title: 'Maya Goldberg missed 3 workouts this week',
    body: 'Compliance dropped to 45%',
    createdAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    read: true,
  },
];

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
  const [items, setItems] = useState<Notif[]>(SAMPLE);

  const filtered = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setItems(items.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay on top of client activity and platform updates."
        actions={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <Check className="size-4" />
              Mark all read
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && <Badge variant="default" className="ms-1">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              description={filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-accent/40',
                    !n.read && 'bg-primary/[0.03]',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      COLORS[n.kind],
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
