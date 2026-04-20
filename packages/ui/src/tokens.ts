/**
 * Cross-platform design tokens. Pure constants — no runtime deps.
 */

/** Brand purple scale (OWL Performance). */
export const brand = {
  50: '#F3F0FA',
  100: '#E2DBF4',
  200: '#C6B8E9',
  300: '#A590DC',
  400: '#8772D1',
  500: '#6E58C8',
  600: '#5E4CB5',
  700: '#4F409B',
  800: '#3F3380',
  900: '#2E2660',
} as const;

/** Warm amber accent scale. */
export const accent = {
  400: '#F0BA5A',
  500: '#E0A93D',
  600: '#C28F2C',
} as const;

/** 4-pt spacing scale in dp / rem-ish increments. */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Corner radii. */
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

/** Typography scale. */
export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Motion durations in ms. */
export const durations = {
  instant: 0,
  fast: 150,
  base: 240,
  slow: 360,
  slower: 500,
} as const;

export type Brand = typeof brand;
export type Accent = typeof accent;
export type Spacing = typeof spacing;
export type Radii = typeof radii;
