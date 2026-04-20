import type { ViewStyle } from 'react-native';

/**
 * Shadow presets — the mobile equivalents of the web's shadow utilities.
 * Android uses `elevation`; iOS uses the shadow* properties.
 */
export const shadows = {
  none: {} as ViewStyle,
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } satisfies ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  } satisfies ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  } satisfies ViewStyle,
};

export type ShadowKey = keyof typeof shadows;
