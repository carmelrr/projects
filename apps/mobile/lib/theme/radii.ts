/**
 * Radius tokens — matches the web's --radius scale.
 *   --radius: 0.75rem (12px) → `lg`
 *   --radius-sm: calc(var(--radius) - 4px) → 8px
 *   --radius-md: calc(var(--radius) - 2px) → 10px
 *   --radius-xl: calc(var(--radius) + 4px) → 16px
 *   --radius-2xl: calc(var(--radius) + 8px) → 20px
 */
export const radii = {
  none: 0,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radii;
