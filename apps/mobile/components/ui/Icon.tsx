import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/colors';

type ColorKey =
  | keyof Pick<Palette,
      | 'foreground'
      | 'mutedForeground'
      | 'primary'
      | 'destructive'
      | 'success'
      | 'warning'
      | 'info'
    >;

export interface IconProps extends Omit<LucideProps, 'color' | 'size'> {
  icon: ComponentType<LucideProps>;
  size?: number;
  color?: ColorKey | string;
  /** Stroke width — defaults to 1.75 to match the web's feather feel. */
  strokeWidth?: number;
}

/**
 * Wrapper around any lucide-react-native icon that resolves color from the
 * theme. Pass any lucide icon via `icon`:
 *   <Icon icon={CalendarCheck} color="primary" />
 */
export function Icon({ icon: IconComponent, size = 20, color = 'foreground', strokeWidth = 1.75, ...rest }: IconProps) {
  const theme = useTheme();

  const paletteKeys: ColorKey[] = [
    'foreground',
    'mutedForeground',
    'primary',
    'destructive',
    'success',
    'warning',
    'info',
  ];

  const resolved =
    paletteKeys.includes(color as ColorKey)
      ? theme.colors[color as ColorKey]
      : (color as string);

  return <IconComponent size={size} color={resolved} strokeWidth={strokeWidth} {...rest} />;
}
