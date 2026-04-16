import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ThreadParticipant {
  userId: string;
  role: string;
  unreadCount: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface Thread {
  id: string;
  orgId: string;
  type: 'DIRECT' | 'GROUP';
  title?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants: ThreadParticipant[];
  unreadCount?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body?: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  replyToId?: string;
  assetId?: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface MessagesResponse {
  items: Message[];
  nextCursor?: string;
}

// ── REST Hooks ─────────────────────────────────────────────────────────────

export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => api.get<Thread[]>('/messaging/threads'),
    refetchInterval: 10_000, // poll every 10s as fallback
  });
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => api.get<MessagesResponse>(`/messaging/threads/${threadId}/messages?limit=50`),
    enabled: !!threadId,
  });
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { body?: string; messageType?: string; replyToId?: string }) =>
      api.post<Message>(`/messaging/threads/${threadId}/messages`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', threadId] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useGetOrCreateDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<Thread>('/messaging/threads/direct', { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useMarkRead(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/messaging/threads/${threadId}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

// ── Socket.io Hook ─────────────────────────────────────────────────────────

export function useMessagingSocket(
  userId: string | undefined,
  activeThreadId: string | undefined,
  onNewMessage: (msg: Message) => void,
  onTyping: (data: { threadId: string; userId: string }) => void,
  onStopTyping: (data: { threadId: string; userId: string }) => void,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const prevThreadRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let socket: any;

    // Lazy-load socket.io-client to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';
      socket = io(`${apiBase}/messaging`, {
        auth: { userId, token: tokenStore.getAccess() },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('new_message', (msg: Message) => {
        onNewMessage(msg);
      });

      socket.on('user_typing', onTyping);
      socket.on('user_stop_typing', onStopTyping);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Join / leave thread room on change
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (prevThreadRef.current) {
      s.emit('leave_thread', { threadId: prevThreadRef.current });
    }
    if (activeThreadId) {
      s.emit('join_thread', { threadId: activeThreadId });
    }
    prevThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  const sendTyping = useCallback(
    (threadId: string) => socketRef.current?.emit('typing', { threadId, userId }),
    [userId],
  );

  const sendStopTyping = useCallback(
    (threadId: string) => socketRef.current?.emit('stop_typing', { threadId, userId }),
    [userId],
  );

  return { sendTyping, sendStopTyping };
}
