import type { TextStyle } from 'react-native';

/**
 * Typography scale — ports the web's type ramp to React Native.
 * All sizes are in dp. `letterSpacing` is in dp (not em) — converted roughly
 * from the web's em values (1em ≈ font size).
 */
export const typography = {
  // Display: used for large marketing-style headlines
  display: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  // 11px uppercase label — matches .text-eyebrow
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.88, // 0.08em * 11
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
