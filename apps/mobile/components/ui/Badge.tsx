import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme, withAlpha } from '@/lib/theme';
import type { Palette } from '@/lib/theme/colors';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted'
  | 'info';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill-shaped label. Matches the web Badge: tinted background (10%) + colored text.
 */
export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const theme = useTheme();

  const colorFor = (v: BadgeVariant): { bg: string; fg: string; border?: string } => {
    const p = theme.colors;
    switch (v) {
      case 'success':
        return { bg: withAlpha(p.success, 0.14), fg: p.success };
      case 'warning':
        return { bg: withAlpha(p.warning, 0.16), fg: p.warning };
      case 'destructive':
        return { bg: withAlpha(p.destructive, 0.14), fg: p.destructive };
      case 'info':
        return { bg: withAlpha(p.info, 0.14), fg: p.info };
      case 'secondary':
        return { bg: p.secondary, fg: p.secondaryForeground };
      case 'muted':
        return { bg: p.muted, fg: p.mutedForeground };
      case 'outline':
        return { bg: 'transparent', fg: p.foreground, border: p.border };
      case 'default':
      default:
        return { bg: withAlpha(p.primary, 0.12), fg: p.primary };
    }
  };

  const { bg, fg, border } = colorFor(variant);

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderColor: border ?? 'transparent',
          borderWidth: border ? 1 : 0,
          borderRadius: theme.radii.full,
          paddingHorizontal: theme.spacing[2.5],
          paddingVertical: theme.spacing[0.5],
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        weight="600"
        color="inherit"
        style={{ color: fg, letterSpacing: 0.2 }}
      >
        {children}
      </Text>
    </View>
  );
}
