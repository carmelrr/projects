import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  targetType?: string;
  frequency?: string;
}

export interface MetricEntry {
  id: string;
  metricId: string;
  clientId: string;
  value: number;
  notes?: string;
  capturedAt: string;
  definition?: MetricDefinition;
}

export function useMetricDefinitions() {
  return useQuery<MetricDefinition[]>({
    queryKey: ['metric-definitions'],
    queryFn: () => api.get<MetricDefinition[]>('/metrics/definitions'),
  });
}

export function useLatestMetrics() {
  const { user } = useAuthStore();

  return useQuery<MetricEntry[]>({
    queryKey: ['latest-metrics', user?.id],
    queryFn: () => api.get<MetricEntry[]>(`/metrics/clients/${user!.id}/latest`),
    enabled: !!user?.id,
  });
}

export function useMetricHistory(metricId: string, days = 30) {
  const { user } = useAuthStore();

  return useQuery<MetricEntry[]>({
    queryKey: ['metric-history', user?.id, metricId, days],
    queryFn: () =>
      api.get<MetricEntry[]>(
        `/metrics/clients/${user!.id}/${metricId}/history?days=${days}`,
      ),
    enabled: !!user?.id && !!metricId,
  });
}

export function useLogMetric() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (body: {
      metricId: string;
      value: number;
      notes?: string;
      capturedAt?: string;
    }) => api.post<MetricEntry>(`/metrics/clients/${user!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['latest-metrics', user?.id] });
      qc.invalidateQueries({ queryKey: ['metric-history', user?.id] });
    },
  });
}
