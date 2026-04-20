import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import { palettes, type ColorScheme, type Palette } from './colors';
import { spacing } from './spacing';
import { radii } from './radii';
import { typography } from './typography';
import { shadows } from './shadows';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadows;
}

function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palettes[scheme],
    spacing,
    radii,
    typography,
    shadows,
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

function resolve(scheme: ColorSchemeName): ColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<ColorScheme>(() =>
    resolve(Appearance.getColorScheme()),
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(resolve(colorScheme));
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(() => buildTheme(scheme), [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
