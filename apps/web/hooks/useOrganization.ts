import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Organization {
  id: string;
  name: string;
  timezone?: string;
  logoUrl?: string | null;
  website?: string | null;
  address?: string | null;
  primaryColor?: string | null;
  [key: string]: unknown;
}

export function useOrganization(orgId: string | undefined) {
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => api.get<Organization>(`/organizations/${orgId}`),
    enabled: !!orgId,
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      ...body
    }: {
      orgId: string;
      name?: string;
      timezone?: string;
      logoUrl?: string | null;
      website?: string | null;
      address?: string | null;
      primaryColor?: string | null;
    }) => api.patch<Organization>(`/organizations/${orgId}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['organization', vars.orgId] });
    },
  });
}
