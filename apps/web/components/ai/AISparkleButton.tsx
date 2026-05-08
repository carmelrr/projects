'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISparkleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Inline pill-shaped button used to trigger AI suggestions next to a field.
 */
export function AISparkleButton({
  onClick,
  loading = false,
  disabled = false,
  label,
  size = 'sm',
  className,
}: AISparkleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      ) : (
        <Sparkles className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
      {label ?? 'AI'}
    </button>
  );
}
