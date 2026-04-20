import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { useTheme } from '@/lib/theme';

export type ButtonVariant =
  | 'default'
  | 'gradient'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'secondary';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  children?: ReactNode;
  onPress?: PressableProps['onPress'];
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  loading,
  iconLeft,
  iconRight,
  style,
  fullWidth,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const p = theme.colors;

  const sizes: Record<ButtonSize, { h: number; px: number; fontSize: number; radius: number }> = {
    sm: { h: 32, px: theme.spacing[3], fontSize: 12, radius: theme.radii.sm },
    md: { h: 40, px: theme.spacing[4], fontSize: 14, radius: theme.radii.md },
    lg: { h: 48, px: theme.spacing[6], fontSize: 16, radius: theme.radii.lg },
    xl: { h: 52, px: theme.spacing[7], fontSize: 16, radius: theme.radii.lg },
    icon: { h: 40, px: 0, fontSize: 14, radius: theme.radii.md },
  };
  const s = sizes[size];

  const variantStyle = (): { bg: string; fg: string; border?: string } => {
    switch (variant) {
      case 'outline':
        return { bg: p.background, fg: p.foreground, border: p.border };
      case 'ghost':
        return { bg: 'transparent', fg: p.foreground };
      case 'destructive':
        return { bg: p.destructive, fg: p.destructiveForeground };
      case 'secondary':
        return { bg: p.secondary, fg: p.secondaryForeground };
      case 'gradient':
        // Rendered via LinearGradient below; `bg` is the transparent fallback
        // so the gradient shows through the Pressable's background.
        return { bg: 'transparent', fg: p.primaryForeground };
      case 'default':
      default:
        return { bg: p.primary, fg: p.primaryForeground };
    }
  };

  const { bg, fg, border } = variantStyle();
  const isGradient = variant === 'gradient';
  const gradientColors: readonly [string, string] = [p.brand[500], p.brand[700]];

  const handlePress = (e: GestureResponderEvent) => {
    // Only solid-fill variants trigger haptics — ghost / outline / secondary
    // are visually secondary actions and should not buzz the device.
    const isSolid = variant === 'default' || variant === 'gradient' || variant === 'destructive';
    if (Platform.OS !== 'web' && !disabled && !loading && isSolid) {
      const style =
        variant === 'destructive'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {
        /* haptics may be unavailable (simulator, some Android) */
      });
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: s.h,
          paddingHorizontal: size === 'icon' ? 0 : s.px,
          width: size === 'icon' ? s.h : fullWidth ? '100%' : undefined,
          borderRadius: s.radius,
          backgroundColor: bg,
          borderColor: border ?? 'transparent',
          borderWidth: border ? 1 : 0,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing[2],
          overflow: isGradient ? 'hidden' : undefined,
        },
        variant !== 'ghost' && variant !== 'outline' ? theme.shadows.sm : null,
        pressed && !disabled ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
        (disabled || loading) ? { opacity: 0.55 } : null,
        style,
      ]}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: s.radius,
          }}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {iconLeft ? <View>{iconLeft}</View> : null}
          {children ? (
            <Text
              variant="bodyMedium"
              color="inherit"
              style={{ color: fg, fontSize: s.fontSize, fontWeight: '600' }}
            >
              {children}
            </Text>
          ) : null}
          {iconRight ? <View>{iconRight}</View> : null}
        </>
      )}
    </Pressable>
  );
}
