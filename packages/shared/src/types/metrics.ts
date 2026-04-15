export interface MetricDefinitionDTO {
  id: string;
  orgId: string;
  name: string;
  unit: string;
  targetType: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'TARGET_VALUE';
  frequency?: string;
  isSystem: boolean;
}

export interface MetricEntryDTO {
  id: string;
  metricId: string;
  clientId: string;
  value: number;
  notes?: string;
  source: string;
  capturedAt: string;
}

export interface ComplianceSummaryDTO {
  clientId: string;
  period: 'SEVEN_DAY' | 'THIRTY_DAY' | 'NINETY_DAY';
  totalScheduled: number;
  totalCompleted: number;
  complianceRate: number;
  needsAttention: boolean;
}
