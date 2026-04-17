import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Coach {
  id: string;
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
