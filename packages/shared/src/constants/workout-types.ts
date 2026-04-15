export const WorkoutType = {
  STRENGTH: 'STRENGTH',
  HIIT: 'HIIT',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  FOR_TIME: 'FOR_TIME',
  CARDIO: 'CARDIO',
  MOBILITY: 'MOBILITY',
  ASSESSMENT: 'ASSESSMENT',
  CUSTOM: 'CUSTOM',
} as const;

export type WorkoutType = (typeof WorkoutType)[keyof typeof WorkoutType];
