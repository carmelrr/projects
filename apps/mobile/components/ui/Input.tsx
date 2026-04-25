import {
  forwardRef,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
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
 *
 * Android keyboard-blur fix: every prop reaching the inner native View /
 * TextInput is memoized. Style objects keep stable references between
 * renders unless their dependencies actually change. Without this, Android
 * tears down and recreates the EditText backing a `secureTextEntry`
 * TextInput on the first keystroke (parent View receives a fresh inline
 * style object) which dismisses the keyboard. For an even safer
 * password-only experience, see `PasswordInput` (no internal focus state).
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

  // Keep latest user-supplied focus handlers in a ref so our wrappers below
  // can stay referentially stable across renders.
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  onFocusRef.current = onFocus;
  onBlurRef.current = onBlur;

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      setFocused(true);
      onFocusRef.current?.(e);
    },
    [],
  );
  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (e) => {
      setFocused(false);
      onBlurRef.current?.(e);
    },
    [],
  );

  const borderColor = error
    ? theme.colors.destructive
    : focused
    ? theme.colors.ring
    : theme.colors.input;

  // Stable iOS-only shadow values — keys are always present so Android does
  // not see the wrapper View's style shape change between renders.
  const showShadow = focused && !error && Platform.OS === 'ios';

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
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
    }),
    [theme, borderColor, editable, showShadow],
  );

  const baseInputStyle = useMemo(
    () => ({
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 14,
      paddingVertical: theme.spacing[2.5],
      ...(tabular ? { fontVariant: ['tabular-nums' as const] } : null),
    }),
    [theme, tabular],
  );

  const combinedInputStyle = useMemo(
    () => [baseInputStyle, inputStyle],
    [baseInputStyle, inputStyle],
  );

  const resolvedPlaceholderColor = useMemo(
    () =>
      placeholderTextColor ?? withAlpha(theme.colors.mutedForeground, 0.8),
    [placeholderTextColor, theme],
  );

  const labelStyle = useMemo(
    () => ({ marginBottom: theme.spacing[1.5] }),
    [theme],
  );
  const messageStyle = useMemo(
    () => ({ marginTop: theme.spacing[1] }),
    [theme],
  );

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="captionMedium" color="mutedForeground" style={labelStyle}>
          {label}
        </Text>
      ) : null}
      <View style={wrapperStyle}>
        {leftIcon ? <View>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={rest.accessibilityHint ?? rest.placeholder}
          accessibilityState={{ disabled: !editable }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={resolvedPlaceholderColor}
          style={combinedInputStyle}
        />
        {rightIcon ? <View>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text
          variant="caption"
          color="destructive"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={messageStyle}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="mutedForeground" style={messageStyle}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export const Input = memo(InputInner);
