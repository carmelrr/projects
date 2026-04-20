import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type ViewStyle,
} from 'react-native';

export interface FadeInUpProps {
  children: ReactNode;
  /** Delay before the animation starts (ms). Default 0. */
  delay?: number;
  /** Duration of the animation (ms). Default 320. */
  duration?: number;
  /** Distance to translate from in dp. Default 12. */
  distance?: number;
  style?: ViewStyle;
}

/**
 * FadeInUp — drop-in entrance animation for auth/marketing screens.
 * Mirrors the web's `motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}`.
 *
 * Honors the OS "Reduce Motion" accessibility setting: when enabled, renders
 * children immediately at final opacity/position with no animation.
 */
export function FadeInUp({
  children,
  delay = 0,
  duration = 320,
  distance = 12,
  style,
}: FadeInUpProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        /* older RN versions may not support this — default to animated */
      });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) setReduceMotion(enabled);
      },
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, duration, delay, reduceMotion]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View
      style={[{ opacity: progress, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
