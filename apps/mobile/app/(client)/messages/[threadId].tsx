import { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMessages,
  useSendMessage,
  useMarkRead,
  type Message,
} from '@/hooks/useMessaging';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Icon, Button } from '@/components/ui';

function MessageBubble({
  message,
  isMine,
}: {
  message: Message;
  isMine: boolean;
}) {
  const theme = useTheme();
  const isSystem = message.messageType === 'SYSTEM';

  if (isSystem) {
    return (
      <View style={{ alignItems: 'center', marginVertical: theme.spacing[2] }}>
        <Text
          variant="caption"
          color="mutedForeground"
          style={{ fontStyle: 'italic', textAlign: 'center' }}
        >
          {message.body}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: isMine ? 'flex-end' : 'flex-start',
        marginVertical: theme.spacing[0.5],
      }}
    >
      <View
        style={{
          maxWidth: '78%',
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
          borderRadius: theme.radii.xl,
          backgroundColor: isMine ? theme.colors.primary : theme.colors.card,
          borderWidth: isMine ? 0 : 1,
          borderColor: theme.colors.border,
          borderTopStartRadius: isMine ? theme.radii.xl : theme.radii.sm,
          borderTopEndRadius: isMine ? theme.radii.sm : theme.radii.xl,
        }}
      >
        <Text
          variant="body"
          color="inherit"
          style={{
            color: isMine
              ? theme.colors.primaryForeground
              : theme.colors.foreground,
            lineHeight: 20,
          }}
        >
          {message.body ?? '[attachment]'}
        </Text>
        <Text
          variant="caption"
          color="inherit"
          style={{
            fontSize: 10,
            marginTop: theme.spacing[0.5],
            color: isMine
              ? withAlpha(theme.colors.primaryForeground, 0.7)
              : theme.colors.mutedForeground,
            textAlign: isMine ? 'right' : 'left',
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

export default function ThreadScreen() {
  const theme = useTheme();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user } = useAuthStore();
  const listRef = useRef<FlatList<Message>>(null);

  const { data, isLoading, refetch } = useMessages(threadId!);
  const send = useSendMessage(threadId!);
  const markRead = useMarkRead(threadId!);

  const [text, setText] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);

  const messages = (data?.items ?? []).slice();

  useEffect(() => {
    if (threadId) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    setText('');
    try {
      await send.mutateAsync({ body: trimmed, messageType: 'TEXT' });
      refetch();
    } catch {
      setText(trimmed);
    }
  };

  const canSend = text.trim().length > 0 && !send.isPending;

  return (
    <Screen edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[1],
            opacity: pressed ? 0.6 : 1,
            minWidth: 64,
          })}
        >
          <Icon icon={ArrowLeft} size={18} color="primary" />
          <Text variant="bodyMedium" color="primary">
            Back
          </Text>
        </Pressable>
        <Text variant="h3">Conversation</Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={{
              padding: theme.spacing[4],
              flexGrow: 1,
            }}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.senderId === user?.id}
              />
            )}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing[10],
                  gap: theme.spacing[3],
                  transform: [{ scaleY: -1 }],
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: theme.radii.full,
                    backgroundColor: withAlpha(theme.colors.primary, 0.1),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon icon={MessageSquare} size={24} color="primary" />
                </View>
                <Text variant="h3">No messages yet</Text>
                <Text
                  variant="body"
                  color="mutedForeground"
                  style={{ textAlign: 'center' }}
                >
                  Send the first message to start the conversation.
                </Text>
              </View>
            }
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: theme.spacing[2],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            placeholder="Type a message…"
            placeholderTextColor={withAlpha(theme.colors.mutedForeground, 0.8)}
            multiline
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: composerFocused
                ? theme.colors.ring
                : theme.colors.input,
              borderRadius: theme.radii.full,
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[2.5],
              fontSize: 15,
              color: theme.colors.foreground,
              maxHeight: 100,
              backgroundColor: theme.colors.background,
            }}
          />
          <Button
            onPress={handleSend}
            disabled={!canSend}
            loading={send.isPending}
            size="icon"
            style={{ borderRadius: theme.radii.full }}
            accessibilityLabel="Send message"
            iconLeft={
              !send.isPending ? (
                <Icon
                  icon={Send}
                  size={18}
                  color={theme.colors.primaryForeground}
                />
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
