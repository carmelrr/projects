import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Coach {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: () => api.get<Coach[]>('/organizations/coaches'),
  });
}

export function useMyCoach() {
  return useQuery({
    queryKey: ['my-coach'],
    queryFn: () => api.get<Coach | null>('/users/me/coach'),
  });
}
