import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';
import { withAlpha } from '@/lib/theme/colors';

export interface SkeletonProps {
  /** Width in dp or percent string. */
  width?: number | `${number}%`;
  /** Height in dp. */
  height?: number;
  /** Corner radius override. Defaults to `theme.radii.sm`. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shimmering placeholder for loading states. Uses the native driver so the
 * pulse stays silky even while JS is busy hydrating the real content.
 */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: withAlpha(theme.colors.mutedForeground, 0.18),
          opacity,
        },
        style,
      ]}
    >
      <View />
    </Animated.View>
  );
}
