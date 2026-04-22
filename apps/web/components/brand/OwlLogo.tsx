import Image from 'next/image';
import { cn } from '@/lib/utils';

type Variant = 'mark' | 'wordmark' | 'lockup';
type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { px: number; cls: string }> = {
  sm: { px: 24, cls: 'size-6' },
  md: { px: 32, cls: 'size-8' },
  lg: { px: 40, cls: 'size-10' },
};

export function OwlLogo({
  variant = 'lockup',
  size = 'md',
  className,
  showSubtitle = false,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  showSubtitle?: boolean;
}) {
  const { px, cls } = sizeMap[size];

  const Mark = (
    <Image
      src="/images/op-logo-transparent.png"
      alt="OP"
      width={px}
      height={px}
      className={cn(
        cls,
        'shrink-0 dark:invert',
        variant === 'mark' && className,
      )}
    />
  );

  if (variant === 'mark') return Mark;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {Mark}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight text-foreground">
          {variant === 'wordmark' ? 'O.P.' : 'OP'}
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
