import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  readAt?: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export function useNotifications(opts?: { unreadOnly?: boolean }) {
  const unreadOnly = opts?.unreadOnly ? '&unreadOnly=true' : '';
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', { unreadOnly: !!opts?.unreadOnly }],
    queryFn: () =>
      api.get<NotificationsResponse>(`/notifications?limit=50${unreadOnly}`),
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
