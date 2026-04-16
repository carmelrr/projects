'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, Activity, ChevronRight, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/layout/StatCard';

const SECTIONS = [
  {
    icon: Users,
    title: 'Users & roles',
    desc: 'Invite team members, assign roles, and manage permissions.',
    href: '/admin/users',
  },
  {
    icon: FileText,
    title: 'Audit log',
    desc: 'Review every action taken on the platform.',
    href: '/admin/audit',
  },
  {
    icon: Activity,
    title: 'System health',
    desc: 'Monitor uptime, queue depth, and background jobs.',
    href: '/admin/system',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  useEffect(() => {
    // Redirect non-admins after a short delay so they see the gate
    if (user && !isAdmin) {
      const t = setTimeout(() => router.push('/dashboard'), 2000);
      return () => clearTimeout(t);
    }
  }, [user, isAdmin, router]);

  if (!user) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={Lock}
              title="Admin access required"
              description="You don't have permission to view this page. Redirecting…"
              action={
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to dashboard
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Admin"
        description="Organization-wide controls and observability."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active users" value="—" />
        <StatCard label="Total clients" value="—" />
        <StatCard label="Workouts logged (30d)" value="—" />
        <StatCard label="Storage used" value="—" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.title}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(s.href)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(s.href);
                }
              }}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={Shield}
            title="More controls coming soon"
            description="Billing, SSO, and granular permissions are in development."
          />
        </CardContent>
      </Card>
    </div>
  );
}
