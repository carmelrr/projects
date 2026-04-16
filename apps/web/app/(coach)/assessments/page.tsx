'use client';

import { ClipboardList, Plus, FileText, Activity, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TEMPLATES = [
  {
    id: 'paq',
    icon: Stethoscope,
    title: 'PAR-Q Health Screening',
    desc: 'Quick health & readiness screen for new clients.',
    questions: 7,
  },
  {
    id: 'goals',
    icon: FileText,
    title: 'Goal Setting & Lifestyle',
    desc: 'Understand the client\'s goals, schedule, and habits.',
    questions: 12,
  },
  {
    id: 'movement',
    icon: Activity,
    title: 'Movement Assessment',
    desc: 'Functional movement screen — record findings & restrictions.',
    questions: 9,
  },
];

export default function AssessmentsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Assessments"
        description="Build forms, send to clients, and review responses over time."
        actions={
          <Button variant="gradient">
            <Plus className="size-4" />
            New assessment
          </Button>
        }
      />

      {/* Templates */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Templates</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t, i) => {
            const Icon = t.icon;
            return (
              <Card
                key={t.id}
                className={`card-interactive anim-fade-up ${
                  i === 1 ? 'anim-fade-up-delay-1' : i === 2 ? 'anim-fade-up-delay-2' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="muted">{t.questions} questions</Badge>
                    <Button variant="outline" size="sm">
                      Use template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Responses placeholder */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recent responses</h2>
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={ClipboardList}
              title="No responses yet"
              description="Send an assessment to a client to start collecting responses."
              action={
                <Button variant="gradient">
                  <Plus className="size-4" />
                  Create assessment
                </Button>
              }
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
