import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(40% 60% at 50% 0%, color-mix(in oklab, var(--brand-500) 18%, transparent), transparent 70%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        {illustration ?? <DefaultIllustration Icon={Icon} />}
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{title}</p>
          {description && (
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

function DefaultIllustration({ Icon }: { Icon?: LucideIcon }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-0 -m-3 rounded-full blur-xl"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--brand-500) 35%, transparent), transparent 75%)',
        }}
      />
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 shadow-sm dark:from-brand-900/40 dark:to-brand-800/40 dark:text-brand-200">
        {Icon ? <Icon className="size-6" /> : <SparkleMark />}
      </div>
    </div>
  );
}

function SparkleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.8 4.5L18 9.3l-4.2 1.8L12 15.6l-1.8-4.5L6 9.3l4.2-1.8L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </svg>
  );
}
