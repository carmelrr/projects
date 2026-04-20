import { Image, View, type ImageStyle, type ViewStyle } from 'react-native';
import { useTheme, withAlpha } from '@/lib/theme';

const SOURCE = require('../assets/images/owl-logo.png');

export interface OwlLogoProps {
  /** Square size in dp. Default 56. */
  size?: number;
  /** Render the logo on a tinted brand-square (matches the web hero card). */
  framed?: boolean;
  /** Override the corner radius of the frame. Default = size * 0.28. */
  radius?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  /** Accessibility label. Defaults to brand name. */
  accessibilityLabel?: string;
}

/**
 * OwlLogo — brand mark for OWL Performance.
 * Use `framed` for auth/marketing splash blocks (matches the web's
 * gradient-bordered logo tile); use the bare image inline.
 */
export function OwlLogo({
  size = 56,
  framed,
  radius,
  style,
  imageStyle,
  accessibilityLabel = 'OWL Performance',
}: OwlLogoProps) {
  const theme = useTheme();
  const r = radius ?? Math.round(size * 0.28);

  if (framed) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            width: size,
            height: size,
            borderRadius: r,
            backgroundColor: withAlpha(theme.colors.primary, 0.1),
            borderWidth: 1,
            borderColor: withAlpha(theme.colors.primary, 0.18),
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <Image
          source={SOURCE}
          resizeMode="contain"
          style={[
            { width: Math.round(size * 0.78), height: Math.round(size * 0.78) },
            imageStyle,
          ]}
        />
      </View>
    );
  }

  return (
    <Image
      source={SOURCE}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, imageStyle]}
    />
  );
}
