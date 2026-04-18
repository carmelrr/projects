import Image from 'next/image';
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
    <Image
      src="/images/op-logo.png"
      alt="OWL Performance"
      width={28}
      height={28}
      className={cn('size-7 shrink-0', variant === 'mark' && className)}
    />
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
