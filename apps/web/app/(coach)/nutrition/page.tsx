'use client';

import { Apple, Plus, Utensils, Droplet, Target, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: Utensils,
    title: 'Meal plans',
    desc: 'Build flexible meal templates with macro targets per meal.',
  },
  {
    icon: Target,
    title: 'Macro & calorie targets',
    desc: 'Set daily targets per client with auto-adjustment based on goals.',
  },
  {
    icon: Droplet,
    title: 'Habit tracking',
    desc: 'Hydration, sleep, steps — daily check-ins for client accountability.',
  },
];

export default function NutritionPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Nutrition"
        description="Coaching beyond the gym — meal plans, macros, and habits."
        actions={
          <Button variant="gradient" disabled>
            <Plus className="size-4" />
            New plan
          </Button>
        }
      />

      <Card className="relative overflow-hidden border-primary/30">
        <div className="aurora absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Nutrition module</h3>
                <Badge variant="warning">Coming soon</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re building a full nutrition coaching toolkit. Get notified when it ships.
              </p>
            </div>
          </div>
          <Button variant="outline">Notify me</Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card
              key={f.title}
              className={`card-interactive anim-fade-up ${
                i === 1 ? 'anim-fade-up-delay-1' : i === 2 ? 'anim-fade-up-delay-2' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={Apple}
            title="No meal plans yet"
            description="The nutrition module is in development. Check back soon."
          />
        </CardContent>
      </Card>
    </div>
  );
}
