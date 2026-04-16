import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Crumb = { label: React.ReactNode; href?: string };

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'anim-fade-up mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <li key={i} className="flex items-center gap-1">
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="truncate hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn('truncate', isLast && 'text-foreground')}
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                    {!isLast && (
                      <ChevronRight
                        className="size-3 text-muted-foreground/60 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{actions}</div>
      )}
    </div>
  );
}
