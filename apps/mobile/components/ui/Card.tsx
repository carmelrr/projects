import type { ReactNode } from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import { withAlpha } from '@/lib/theme/colors';

export type CardTone = 'default' | 'brand' | 'success' | 'warning' | 'destructive' | 'muted';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Card — themed rounded-xl surface with a 1px border. Matches the web Card primitive.
 * If `onPress` is given it renders as a `Pressable` with a subtle press-down.
 */
export function Card({
  children,
  tone = 'default',
  style,
  onPress,
  disabled,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const isDark = theme.scheme === 'dark';
  const bgAlpha = isDark ? 0.18 : 0.08;
  const borderAlpha = isDark ? 0.32 : 0.22;

  const backgrounds: Record<CardTone, string> = {
    default: c.card,
    brand: withAlpha(c.primary, bgAlpha),
    success: withAlpha(c.success, bgAlpha),
    warning: withAlpha(c.warning, bgAlpha),
    destructive: withAlpha(c.destructive, bgAlpha),
    muted: c.muted,
  };

  const borders: Record<CardTone, string> = {
    default: c.border,
    brand: withAlpha(c.primary, borderAlpha),
    success: withAlpha(c.success, borderAlpha),
    warning: withAlpha(c.warning, borderAlpha),
    destructive: withAlpha(c.destructive, borderAlpha),
    muted: c.border,
  };

  const baseStyle: ViewStyle = {
    backgroundColor: backgrounds[tone],
    borderColor: borders[tone],
    borderWidth: 1,
    borderRadius: theme.radii.xl,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          baseStyle,
          pressed && !disabled ? { opacity: 0.88, transform: [{ translateY: 1 }] } : null,
          disabled ? { opacity: 0.5 } : null,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}
