import { ActivityIndicator, Pressable, View, ViewStyle } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/lib/theme';
import { Text } from '@/components/ui';

interface AISparkleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/**
 * Small inline button that triggers an AI suggestion. Shows a sparkle icon,
 * a loading spinner while pending, and a subtle gradient-ish surface.
 */
export function AISparkleButton({
  onPress,
  loading = false,
  disabled = false,
  label,
  size = 'md',
  style,
}: AISparkleButtonProps) {
  const theme = useTheme();
  const iconSize = size === 'sm' ? 14 : 16;
  const padV = size === 'sm' ? theme.spacing[1] : theme.spacing[1.5];
  const padH = size === 'sm' ? theme.spacing[2] : theme.spacing[3];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[1.5],
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: theme.radii.full,
          backgroundColor: withAlpha(theme.colors.primary, pressed ? 0.22 : 0.14),
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.primary, 0.35),
          opacity: disabled ? 0.5 : 1,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Sparkles size={iconSize} color={theme.colors.primary} />
      )}
      {label ? (
        <Text
          variant="caption"
          style={{ color: theme.colors.primary, fontWeight: '700' }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface AIInlineHeaderProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Renders a row with a label on the left and an AI sparkle button on the right.
 * Useful as a field caption replacement.
 */
export function AIFieldHeader({ label, onPress, loading, disabled }: AIInlineHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      <AISparkleButton onPress={onPress} loading={loading} disabled={disabled} size="sm" label="AI" />
    </View>
  );
}
