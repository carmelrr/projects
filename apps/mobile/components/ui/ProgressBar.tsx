import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

export interface ProgressBarProps {
  /** 0–1 */
  value: number;
  tone?: 'primary' | 'success' | 'warning' | 'destructive';
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Screen reader label. Default "Progress". */
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  tone = 'primary',
  height = 6,
  style,
  accessibilityLabel = 'Progress',
}: ProgressBarProps) {
  const theme = useTheme();
  const colorMap = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    destructive: theme.colors.destructive,
  };
  const clamped = Math.max(0, Math.min(1, value));
  const pct = clamped * 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.muted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: colorMap[tone],
        }}
      />
    </View>
  );
}
