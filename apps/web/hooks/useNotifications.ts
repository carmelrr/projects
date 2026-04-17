import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  channel?: string;
  sentAt?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

export function useNotifications(query?: { unreadOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.unreadOnly) params.set('unreadOnly', 'true');
      if (query?.limit) params.set('limit', String(query.limit));
      const qs = params.toString();
      return api.get<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
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
