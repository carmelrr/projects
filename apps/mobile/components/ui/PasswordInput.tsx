import { forwardRef, memo, useMemo, type ReactNode } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useTheme, withAlpha } from '@/lib/theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
}

/**
 * PasswordInput — a `secureTextEntry` field that intentionally does NOT track
 * focus state internally. On Android, any re-render of the wrapping View while
 * a `secureTextEntry` TextInput is mounted causes the native EditText to be
 * torn down and rebuilt, which dismisses the keyboard on the first keystroke.
 *
 * By avoiding focus state and keeping every prop stable across renders, the
 * native EditText is only ever created once for the lifetime of the field and
 * the keyboard stays open as the user types. Border color only changes on
 * `error` (low-frequency event, not per-keystroke).
 */
const PasswordInputInner = forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput(
    {
      label,
      error,
      hint,
      rightIcon,
      containerStyle,
      inputStyle,
      placeholderTextColor,
      secureTextEntry = true,
      ...rest
    },
    ref,
  ) {
    const theme = useTheme();

    const borderColor = error ? theme.colors.destructive : theme.colors.input;

    const wrapperStyle = useMemo<ViewStyle>(
      () => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        borderWidth: 1,
        borderColor,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing[3],
        minHeight: 44,
      }),
      [theme, borderColor],
    );

    const baseInputStyle = useMemo(
      () => ({
        flex: 1,
        color: theme.colors.foreground,
        fontSize: 14,
        paddingVertical: theme.spacing[2.5],
      }),
      [theme],
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
          <Text
            variant="captionMedium"
            color="mutedForeground"
            style={labelStyle}
          >
            {label}
          </Text>
        ) : null}
        <View style={wrapperStyle}>
          <TextInput
            ref={ref}
            {...rest}
            secureTextEntry={secureTextEntry}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            accessibilityHint={rest.accessibilityHint ?? rest.placeholder}
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
  },
);

export const PasswordInput = memo(PasswordInputInner);
