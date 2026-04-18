import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  status?: string;
  lastLoginAt?: string;
  createdAt?: string;
  orgs: { role: string; orgId: string }[];
  coachProfile?: { id: string; bio?: string | null; specialties?: string[] } | null;
  clientProfile?: { id: string; status: string; goals?: string | null } | null;
}

export type NotificationPrefs = Record<string, boolean>;

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/users/me'),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
    }) => api.patch<Me>('/users/me', body),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['me', 'notification-prefs'],
    queryFn: () => api.get<NotificationPrefs>('/users/me/notification-prefs'),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPrefs) =>
      api.patch<NotificationPrefs>('/users/me/notification-prefs', body),
    onSuccess: (data) => {
      qc.setQueryData(['me', 'notification-prefs'], data);
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (body: { newPassword: string }) =>
      api.patch<{ success: boolean }>('/users/me/password', body),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api.delete<{ success: boolean }>('/users/me'),
  });
}
