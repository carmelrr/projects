import { useState } from 'react';
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen, Card, Text, Input, Button, Icon, OwlLogo, FadeInUp } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { sendPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setError("We couldn't find an account with that email.");
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing[6],
            paddingTop: theme.spacing[4],
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing[2],
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Returns to the previous screen"
          >
            <Icon icon={ChevronLeft} size={18} color="primary" accessible={false} />
            <Text variant="body" color="primary" weight="500">
              Back
            </Text>
          </Pressable>

          <OwlLogo size={48} framed style={{ marginTop: theme.spacing[6] }} />
          <FadeInUp>
            <Text variant="h1" weight="700" style={{ marginTop: theme.spacing[4] }}>
              Reset password
            </Text>
            <Text
              variant="body"
              color="mutedForeground"
              style={{ marginTop: 6, lineHeight: 20 }}
            >
              Enter your email and we&apos;ll send you a link to reset your password.
            </Text>
          </FadeInUp>

          <FadeInUp delay={120}>
          <Card style={{ marginTop: theme.spacing[6] }}>
            {sent ? (
              <View>
                <Text variant="h3" weight="700">
                  Check your inbox
                </Text>
                <Text
                  variant="body"
                  color="mutedForeground"
                  style={{ marginTop: theme.spacing[2], lineHeight: 20 }}
                >
                  We sent a reset link to {email}. Follow the link to set a new password.
                </Text>
                <Button
                  variant="default"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: theme.spacing[5] }}
                >
                  Back to sign in
                </Button>
              </View>
            ) : (
              <>
                {error ? (
                  <View
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={{
                      backgroundColor: withAlpha(theme.colors.destructive, 0.1),
                      borderRadius: theme.radii.sm,
                      padding: theme.spacing[3],
                      marginBottom: theme.spacing[4],
                    }}
                  >
                    <Text variant="body" color="destructive">
                      {error}
                    </Text>
                  </View>
                ) : null}

                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoFocus
                  containerStyle={{ marginBottom: theme.spacing[4] }}
                />

                <Button
                  variant="default"
                  size="lg"
                  fullWidth
                  onPress={submit}
                  disabled={busy}
                  loading={busy}
                  accessibilityHint="Sends a password reset link to the email you entered"
                >
                  Send reset link
                </Button>
              </>
            )}
          </Card>
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
