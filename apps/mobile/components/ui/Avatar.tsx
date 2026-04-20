import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme, withAlpha } from '@/lib/theme';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarTone = 'brand' | 'muted';

export interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  imageUri?: string;
  presence?: 'online' | 'offline';
  style?: StyleProp<ViewStyle>;
}

const DIMENSIONS: Record<AvatarSize, { box: number; font: number; dot: number }> = {
  sm: { box: 28, font: 11, dot: 8 },
  md: { box: 36, font: 13, dot: 10 },
  lg: { box: 48, font: 16, dot: 12 },
};

/**
 * Avatar — circular initials badge with optional image and presence dot.
 * Matches the web Avatar primitive in visual weight.
 */
export function Avatar({
  initials,
  size = 'md',
  tone = 'brand',
  imageUri,
  presence,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const { box, font, dot } = DIMENSIONS[size];

  const toneColors = {
    brand: {
      bg: withAlpha(theme.colors.primary, 0.14),
      fg: theme.colors.primary,
    },
    muted: {
      bg: theme.colors.muted,
      fg: theme.colors.mutedForeground,
    },
  }[tone];

  return (
    <View style={[{ width: box, height: box }, style]}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: box / 2,
          backgroundColor: toneColors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: box, height: box }} />
        ) : (
          <Text
            variant="bodyMedium"
            color="inherit"
            style={{ color: toneColors.fg, fontSize: font, fontWeight: '600' }}
          >
            {initials}
          </Text>
        )}
      </View>
      {presence ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            insetInlineEnd: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor:
              presence === 'online' ? theme.colors.success : theme.colors.mutedForeground,
            borderWidth: 2,
            borderColor: theme.colors.background,
          }}
        />
      ) : null}
    </View>
  );
}
