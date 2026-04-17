import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMessages,
  useSendMessage,
  useMarkRead,
  type Message,
} from '@/hooks/useMessaging';

function MessageBubble({
  message,
  isMine,
}: {
  message: Message;
  isMine: boolean;
}) {
  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {message.messageType === 'SYSTEM' ? (
          <Text style={styles.systemText}>{message.body}</Text>
        ) : (
          <Text style={isMine ? styles.bubbleTextMine : styles.bubbleText}>
            {message.body ?? '[attachment]'}
          </Text>
        )}
        <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
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
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user } = useAuthStore();
  const listRef = useRef<FlatList<Message>>(null);

  const { data, isLoading, refetch } = useMessages(threadId!);
  const send = useSendMessage(threadId!);
  const markRead = useMarkRead(threadId!);

  const [text, setText] = useState('');

  // Reverse the array so newest is at the bottom using inverted list
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Conversation</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <MessageBubble message={item} isMine={item.senderId === user?.id} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  Send the first message to start the conversation.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.composerWrap}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="#9ca3af"
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || send.isPending}
            style={[
              styles.sendBtn,
              (!text.trim() || send.isPending) && styles.sendBtnDisabled,
            ]}
          >
            {send.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    transform: [{ scaleY: -1 }], // undo inverted
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },

  bubbleRow: { alignItems: 'flex-start', marginVertical: 3 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleTheirs: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleMine: {
    backgroundColor: '#2563eb',
    borderTopRightRadius: 4,
  },
  bubbleText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#fff', fontSize: 14, lineHeight: 20 },
  systemText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  timestampMine: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
