import { cn } from '@/lib/utils';

type Variant = 'mark' | 'wordmark' | 'lockup';

export function OwlLogo({
  variant = 'lockup',
  className,
  showSubtitle = false,
}: {
  variant?: Variant;
  className?: string;
  showSubtitle?: boolean;
}) {
  const Mark = (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-7 shrink-0', variant === 'mark' && className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="owl-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-400)" />
          <stop offset="1" stopColor="var(--brand-700)" />
        </linearGradient>
      </defs>
      {/* Body */}
      <rect x="3" y="3" width="34" height="34" rx="10" fill="url(#owl-grad)" />
      {/* Tufts */}
      <path d="M11 9 L15 14 L8 12 Z" fill="var(--brand-200)" opacity="0.95" />
      <path d="M29 9 L25 14 L32 12 Z" fill="var(--brand-200)" opacity="0.95" />
      {/* Eyes */}
      <circle cx="14.5" cy="19" r="4.2" fill="white" />
      <circle cx="25.5" cy="19" r="4.2" fill="white" />
      <circle cx="14.5" cy="19.4" r="2" fill="var(--brand-900)" />
      <circle cx="25.5" cy="19.4" r="2" fill="var(--brand-900)" />
      <circle cx="15.1" cy="18.7" r="0.7" fill="white" />
      <circle cx="26.1" cy="18.7" r="0.7" fill="white" />
      {/* Beak */}
      <path d="M20 22.5 L22 26 L18 26 Z" fill="var(--accent-500)" />
    </svg>
  );

  if (variant === 'mark') return Mark;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {Mark}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight text-foreground">
          {variant === 'wordmark' ? 'OP' : 'Owl Performance'}
        </span>
        {showSubtitle && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Coaching OS
          </span>
        )}
      </div>
    </div>
  );
}
