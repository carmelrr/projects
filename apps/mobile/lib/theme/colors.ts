/**
 * Color tokens — port of apps/web/app/globals.css.
 *
 * Web uses oklch(); these hex values are the sRGB equivalents that best match
 * the web design in both light and dark mode. Keep this file as the single
 * source of truth for color — no other file should hardcode hex.
 */

export const brand = {
  50: '#F3F0FA',
  100: '#E2DBF4',
  200: '#C6B8E9',
  300: '#A590DC',
  400: '#8772D1',
  500: '#6E58C8',
  600: '#5E4CB5', // default primary (light)
  700: '#4F409B',
  800: '#3F3380',
  900: '#2E2660',
} as const;

export const accent = {
  400: '#F0BA5A',
  500: '#E0A93D', // warm amber
  600: '#C28F2C',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  // Surfaces
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // Primary / accent roles
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string; // surface accent (not to be confused with brand accent)
  accentForeground: string;

  // Semantic
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  info: string;

  // Lines + focus
  border: string;
  input: string;
  ring: string;

  // Immersive overlay (video players, lightboxes) — theme-independent.
  scrim: string;
  scrimForeground: string;

  // Brand-scale accessors (for tinted surfaces)
  brand: typeof brand;
  brandAccent: typeof accent;
}

export const lightPalette: Palette = {
  background: '#FBFAFD',
  foreground: '#232234',
  card: '#FFFFFF',
  cardForeground: '#232234',
  popover: '#FFFFFF',
  popoverForeground: '#232234',

  primary: brand[600],
  primaryForeground: '#FDFCFE',
  secondary: '#F2F1F6',
  secondaryForeground: '#2B2A3A',
  muted: '#F3F2F6',
  mutedForeground: '#74727E',
  accent: '#F2F1F6',
  accentForeground: '#2B2A3A',

  destructive: '#D64A3B',
  destructiveForeground: '#FDFCFE',
  success: '#38A87A',
  warning: '#E3A948',
  info: '#4E9EE8',

  border: '#E8E6ED',
  input: '#E8E6ED',
  ring: brand[500],

  scrim: '#000000',
  scrimForeground: '#FFFFFF',

  brand,
  brandAccent: accent,
};

export const darkPalette: Palette = {
  background: '#1B1A22',
  foreground: '#EEECF2',
  card: '#25242E',
  cardForeground: '#EEECF2',
  popover: '#25242E',
  popoverForeground: '#EEECF2',

  primary: brand[400],
  primaryForeground: '#1B1A24',
  secondary: '#33323E',
  secondaryForeground: '#EEECF2',
  muted: '#2E2D38',
  mutedForeground: '#A8A6B2',
  accent: '#3A3649',
  accentForeground: '#EEECF2',

  destructive: '#EA5A4B',
  destructiveForeground: '#FDFCFE',
  success: '#4BBE8E',
  warning: '#F0BA5A',
  info: '#6BB1EE',

  border: 'rgba(160, 158, 172, 0.35)',
  input: 'rgba(160, 158, 172, 0.35)',
  ring: brand[400],

  scrim: '#000000',
  scrimForeground: '#FFFFFF',

  brand,
  brandAccent: accent,
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

/**
 * Add an alpha channel to a hex color. Pass a value 0–1.
 * Does nothing for non-hex inputs (e.g. already-rgba).
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
