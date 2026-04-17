import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => api.get<Thread[]>('/messaging/threads'),
    refetchInterval: 15_000,
  });
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: ['messages', threadId],
    queryFn: () =>
      api.get<MessagesResponse>(`/messaging/threads/${threadId}/messages?limit=50`),
    enabled: !!threadId,
    refetchInterval: 5_000,
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

export function useMarkRead(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/messaging/threads/${threadId}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useCreateDirectThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<Thread>('/messaging/threads/direct', { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
