/**
 * @coaching/ui — cross-platform design tokens shared by web and mobile.
 *
 * This package intentionally exports only platform-agnostic values (no React,
 * no React Native, no DOM). Each app consumes these tokens through its own
 * rendering primitives:
 *   - web: CSS variables in globals.css + Tailwind config
 *   - mobile: ThemeProvider in apps/mobile/lib/theme
 */

export * from './tokens';
