import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────

export interface ExerciseAutofillResult {
  category: string;
  muscleGroups: string[];
  equipment: string[];
  defaultUnits:
    | 'REPS_WEIGHT'
    | 'REPS_ONLY'
    | 'TIME'
    | 'TIME_STOPWATCH'
    | 'TIME_COUNTDOWN'
    | 'DISTANCE'
    | 'CALORIES';
  description: string;
  instructions?: string;
  tags: string[];
  confidence: number;
  suggestionId?: string;
}

export interface ExerciseSuggestion {
  exerciseId: string;
  name: string;
  reason: string;
}

export interface SuggestExercisesResult {
  suggestions: ExerciseSuggestion[];
  suggestionId?: string;
}

export interface PrescriptionResult {
  sets?: number;
  reps?: string;
  weight?: { type: 'absolute' | 'percentage_1rm' | 'rpe_target'; value: number; unit?: 'kg' | 'lbs' };
  rest?: number;
  tempo?: string;
  duration?: number;
  notes?: string;
  rationale: string;
  suggestionId?: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────

export function useExerciseAutofill() {
  return useMutation({
    mutationFn: (input: { name: string; locale?: 'he' | 'en' }) =>
      api.post<ExerciseAutofillResult>('/ai/exercises/autofill', input),
  });
}

export function useSuggestExercises() {
  return useMutation({
    mutationFn: (input: {
      workoutType?: string;
      targetMuscleGroups?: string[];
      availableEquipment?: string[];
      existingExerciseIds?: string[];
      goal?: string;
      count?: number;
      locale?: 'he' | 'en';
    }) => api.post<SuggestExercisesResult>('/ai/workouts/suggest-exercises', input),
  });
}

export function useSuggestPrescription() {
  return useMutation({
    mutationFn: (input: {
      exerciseId: string;
      clientId: string;
      goal?: 'STRENGTH' | 'HYPERTROPHY' | 'ENDURANCE' | 'WEIGHT_LOSS' | 'GENERAL';
      context?: string;
      includeMedical?: boolean;
      locale?: 'he' | 'en';
    }) => api.post<PrescriptionResult>('/ai/prescription/suggest', input),
  });
}

export function useMarkSuggestionAdopted() {
  return useMutation({
    mutationFn: (suggestionId: string) =>
      api.patch<{ ok: boolean }>(`/ai/suggestions/${suggestionId}/adopted`),
  });
}
