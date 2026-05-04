import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Coach {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN_COACH' | 'COACH';
  bio: string | null;
  specialties: string[];
  capacity: number | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface AssignedCoach {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export function useCoaches() {
  return useQuery<Coach[]>({
    queryKey: ['coaches'],
    queryFn: () => api.get('/organizations/coaches'),
  });
}

export function useMyCoach() {
  return useQuery<AssignedCoach | null>({
    queryKey: ['my-coach'],
    queryFn: () => api.get('/users/me/coach'),
  });
}
