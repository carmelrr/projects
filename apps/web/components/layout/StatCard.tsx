import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent = 'brand',
  sparkline,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: { value: number; label?: string };
  icon?: LucideIcon;
  accent?: 'brand' | 'success' | 'warning' | 'destructive' | 'info';
  sparkline?: number[];
  className?: string;
}) {
  const accentClasses = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  } as const;

  const strokeVar = {
    brand: 'var(--brand-500)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    destructive: 'var(--destructive)',
    info: 'var(--info)',
  }[accent];

  return (
    <Card className={cn('card-interactive relative overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              accentClasses[accent],
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              trend.value >= 0
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {trend.value >= 0 ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} stroke={strokeVar} />
      )}
    </Card>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const w = 120;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');
  const fillPath = `M0,${h} L${points.replace(/ /g, ' L')} L${w},${h} Z`;

  return (
    <svg
      className="mt-3 h-7 w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sparkFill)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
