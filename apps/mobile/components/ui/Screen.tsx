import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

export interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
  /** Override the default themed background. */
  background?: string;
  style?: ViewStyle;
  /** Padding in dp. Leave undefined to let the child handle its own padding. */
  padded?: boolean;
}

export function Screen({
  children,
  edges = ['top'],
  background,
  style,
  padded,
}: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[
        { flex: 1, backgroundColor: background ?? theme.colors.background },
        padded ? { padding: theme.spacing[5] } : null,
        style,
      ]}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
