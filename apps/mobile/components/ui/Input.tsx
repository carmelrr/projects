import { forwardRef, memo, useState, type ReactNode } from 'react';
import {
  Platform,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useTheme, withAlpha } from '@/lib/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  tabular?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
}

/**
 * Input — themed TextInput wrapper with label, error, and icon slots.
 * Border uses theme.colors.input (resting) / ring (focus) / destructive (error).
 *
 * NOTE on Android keyboard-blur fix: the wrapping View MUST keep a stable
 * style-key shape across renders. If we conditionally add elevation/shadow*
 * keys when `focused` flips, Android can rebuild the underlying native view
 * and a `secureTextEntry` child TextInput will lose focus on the very first
 * keystroke (which dismisses the keyboard). Here we always emit the same
 * keys and only toggle their *values*. We also render this Input as a
 * `memo` so a sibling input's value-change can't force-re-render the
 * password field's wrapper.
 */
const InputInner = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    tabular,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    editable = true,
    placeholderTextColor,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.destructive
    : focused
    ? theme.colors.ring
    : theme.colors.input;

  // Stable iOS shadow shape — same keys every render, only values change.
  const showShadow = focused && !error && Platform.OS === 'ios';

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          variant="captionMedium"
          color="mutedForeground"
          style={{ marginBottom: theme.spacing[1.5] }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radii.md,
          backgroundColor: editable ? theme.colors.background : theme.colors.muted,
          paddingHorizontal: theme.spacing[3],
          minHeight: 44,
          shadowColor: theme.colors.ring,
          shadowOpacity: showShadow ? 0.15 : 0,
          shadowRadius: showShadow ? 4 : 0,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={rest.accessibilityHint ?? rest.placeholder}
          accessibilityState={{ disabled: !editable }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={placeholderTextColor ?? withAlpha(theme.colors.mutedForeground, 0.8)}
          style={[
            {
              flex: 1,
              color: theme.colors.foreground,
              fontSize: 14,
              paddingVertical: theme.spacing[2.5],
              ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
            },
            inputStyle,
          ]}
        />
        {rightIcon ? <View>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text
          variant="caption"
          color="destructive"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ marginTop: theme.spacing[1] }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="mutedForeground" style={{ marginTop: theme.spacing[1] }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export const Input = memo(InputInner);
