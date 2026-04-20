import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { TypographyVariant } from '@/lib/theme/typography';
import type { Palette } from '@/lib/theme/colors';

type ColorKey =
  | keyof Pick<Palette,
      | 'foreground'
      | 'mutedForeground'
      | 'primary'
      | 'primaryForeground'
      | 'destructive'
      | 'success'
      | 'warning'
      | 'info'
      | 'cardForeground'
      | 'accentForeground'
    >
  | 'inherit';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorKey;
  weight?: '400' | '500' | '600' | '700';
  tabular?: boolean;
}

export function Text({
  variant = 'body',
  color = 'foreground',
  weight,
  tabular,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const base = theme.typography[variant] as TextStyle;
  const resolvedColor =
    color === 'inherit' ? undefined : theme.colors[color];

  const composed: TextStyle = {
    ...base,
    color: resolvedColor,
    ...(weight ? { fontWeight: weight } : null),
    ...(tabular ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : null),
  };

  return <RNText {...rest} style={[composed, style]} />;
}
