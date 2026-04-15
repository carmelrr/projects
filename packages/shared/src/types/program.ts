export interface ProgramTemplateDTO {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  tags: string[];
  weeks: ProgramWeekDTO[];
}

export interface ProgramWeekDTO {
  id: string;
  weekIndex: number;
  title?: string;
  notes?: string;
  workoutIds: string[];
}
