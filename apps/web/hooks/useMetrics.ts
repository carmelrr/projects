import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  targetType?: 'MIN' | 'MAX' | 'RANGE' | 'EXACT';
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  orgId: string;
}

export interface MetricEntry {
  id: string;
  metricId: string;
  clientId: string;
  value: number;
  notes?: string;
  source?: string;
  capturedAt: string;
  definition?: MetricDefinition;
}

export function useMetricDefinitions() {
  return useQuery({
    queryKey: ['metric-definitions'],
    queryFn: () => api.get<MetricDefinition[]>('/metrics/definitions'),
  });
}

export function useMetricHistory(clientId: string, metricId: string, days = 30) {
  return useQuery({
    queryKey: ['metric-history', clientId, metricId, days],
    queryFn: () =>
      api.get<MetricEntry[]>(`/metrics/clients/${clientId}/${metricId}/history?days=${days}`),
    enabled: !!clientId && !!metricId,
  });
}

export function useClientMetrics(clientId: string) {
  return useQuery({
    queryKey: ['client-metrics', clientId],
    queryFn: () => api.get<MetricEntry[]>(`/metrics/clients/${clientId}/latest`),
    enabled: !!clientId,
  });
}

export function useLogMetric(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      metricId: string;
      value: number;
      notes?: string;
      capturedAt?: string;
    }) => api.post<MetricEntry>(`/metrics/clients/${clientId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-metrics', clientId] });
      qc.invalidateQueries({ queryKey: ['metric-history', clientId] });
    },
  });
}

export function useCreateMetricDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; unit: string; targetType?: string; frequency?: string }) =>
      api.post<MetricDefinition>('/metrics/definitions', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metric-definitions'] });
    },
  });
}
