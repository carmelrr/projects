export interface ExerciseDTO {
  id: string;
  orgId?: string | null;
  name: string;
  description?: string;
  category: string;
  equipment: string[];
  muscleGroups: string[];
  defaultUnits: string;
  isSystem: boolean;
  tags: string[];
}
