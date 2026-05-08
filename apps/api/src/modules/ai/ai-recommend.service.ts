import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { AICacheService } from './ai-cache.service';
import { AI_PROVIDER, AIProvider, AISchemaProperty } from './providers/ai-provider.interface';

export interface SuggestExercisesInput {
  workoutType?: string;
  targetMuscleGroups?: string[];
  availableEquipment?: string[];
  existingExerciseIds?: string[];
  goal?: string;
  count?: number;
  locale?: 'he' | 'en';
}

export interface ExerciseSuggestion {
  exerciseId: string;
  name: string;
  reason: string;
}

export interface SuggestExercisesOutput {
  suggestions: ExerciseSuggestion[];
  suggestionId?: string;
}

interface CandidateExercise {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  muscleGroups: string[];
}

const SCHEMA: AISchemaProperty = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['exerciseId', 'reason'],
      },
    },
  },
  required: ['suggestions'],
};

@Injectable()
export class AIRecommendService {
  constructor(
    @Inject(AI_PROVIDER) private provider: AIProvider,
    private cache: AICacheService,
    private exercises: ExercisesService,
  ) {}

  async suggestExercises(
    orgId: string,
    coachId: string,
    input: SuggestExercisesInput,
  ): Promise<SuggestExercisesOutput> {
    if (!this.provider.isAvailable()) {
      throw new ServiceUnavailableException('AI provider not configured');
    }

    const count = clampInt(input.count, 3, 10, 5);
    const exclude = new Set(input.existingExerciseIds ?? []);

    // Pre-filter candidates from the library
    const candidates = await this.fetchCandidates(orgId, input, exclude);
    if (candidates.length === 0) {
      return { suggestions: [] };
    }

    const cacheInput = {
      workoutType: input.workoutType ?? null,
      targetMuscleGroups: (input.targetMuscleGroups ?? []).slice().sort(),
      availableEquipment: (input.availableEquipment ?? []).slice().sort(),
      goal: input.goal ?? null,
      count,
      locale: input.locale ?? 'he',
      // Use sorted candidate ids so cache survives library re-ordering
      candidateIds: candidates.map((c) => c.id).sort(),
      excludeIds: Array.from(exclude).sort(),
    };
    const inputHash = this.cache.hashInput(cacheInput);

    const cached = await this.cache.getCached<SuggestExercisesOutput>(
      orgId,
      'EXERCISE_RECOMMENDATIONS',
      inputHash,
    );
    if (cached) return cached;

    const locale = input.locale ?? 'he';
    const reasonLang =
      locale === 'he' ? 'Write each "reason" in concise Hebrew (≤25 words).' : 'Write each "reason" in concise English (≤25 words).';

    // Cap candidates sent to LLM to keep prompt small
    const trimmed = candidates.slice(0, 60);
    const prompt = [
      `You are helping a coach pick exercises for a workout.`,
      input.workoutType ? `Workout type: ${input.workoutType}` : '',
      input.goal ? `Goal: ${input.goal}` : '',
      input.targetMuscleGroups?.length
        ? `Target muscle groups: ${input.targetMuscleGroups.join(', ')}`
        : '',
      input.availableEquipment?.length
        ? `Available equipment: ${input.availableEquipment.join(', ')}`
        : '',
      ``,
      `Pick the ${count} best exercises from this candidate list (and ONLY from this list).`,
      `Return their exerciseId values exactly as given. Do NOT invent ids.`,
      `Prefer compound movements first, balance opposing muscles, avoid duplicates.`,
      reasonLang,
      ``,
      `Candidates:`,
      ...trimmed.map(
        (c) =>
          `- ${c.id} | ${c.name} | category=${c.category} | muscles=${c.muscleGroups.join('/')} | equipment=${c.equipment.join('/') || 'none'}`,
      ),
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.provider.generateStructured<{
      suggestions: Array<{ exerciseId: string; reason: string }>;
    }>({
      system: 'You are an experienced strength coach selecting exercises for a workout.',
      prompt,
      responseSchema: SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 1200,
    });

    const byId = new Map(trimmed.map((c) => [c.id, c]));
    const suggestions: ExerciseSuggestion[] = [];
    for (const s of result.data.suggestions ?? []) {
      const cand = byId.get(s.exerciseId);
      if (!cand) continue;
      if (suggestions.some((x) => x.exerciseId === cand.id)) continue;
      suggestions.push({
        exerciseId: cand.id,
        name: cand.name,
        reason: (s.reason || '').trim().slice(0, 240),
      });
      if (suggestions.length >= count) break;
    }

    const output: SuggestExercisesOutput = { suggestions };

    const suggestionId = await this.cache.store({
      type: 'EXERCISE_RECOMMENDATIONS',
      inputHash,
      input: cacheInput,
      output,
      model: result.model,
      orgId,
      coachId,
      tokensIn: result.usage?.inputTokens,
      tokensOut: result.usage?.outputTokens,
    });

    return { ...output, suggestionId };
  }

  private async fetchCandidates(
    orgId: string,
    input: SuggestExercisesInput,
    exclude: Set<string>,
  ): Promise<CandidateExercise[]> {
    // Reuse the existing list endpoint logic by scanning the full library
    // (paginated by ExercisesService.listExercises, here we want broad set).
    const muscle = input.targetMuscleGroups?.[0];
    const equipment = input.availableEquipment?.[0];
    const result = await this.exercises.listExercises(orgId, {
      page: '1',
      limit: '100',
      muscleGroup: muscle,
      equipment,
    } as Record<string, string>);

    const items: CandidateExercise[] = [];
    for (const raw of result.items ?? []) {
      const e = raw as Record<string, unknown>;
      const id = String(e['id'] ?? '');
      if (!id || exclude.has(id)) continue;

      const muscleGroups = Array.isArray(e['muscleGroups']) ? (e['muscleGroups'] as string[]) : [];
      const equipmentList = Array.isArray(e['equipment']) ? (e['equipment'] as string[]) : [];

      // If user specified multiple muscle groups, ensure overlap
      if (input.targetMuscleGroups && input.targetMuscleGroups.length > 1) {
        const hit = input.targetMuscleGroups.some((m) => muscleGroups.includes(m));
        if (!hit) continue;
      }
      // If user specified multiple equipment, allow any match or bodyweight
      if (input.availableEquipment && input.availableEquipment.length > 1) {
        const hit =
          equipmentList.length === 0 ||
          equipmentList.some((eq) => input.availableEquipment!.includes(eq));
        if (!hit) continue;
      }

      items.push({
        id,
        name: String(e['name'] ?? ''),
        category: String(e['category'] ?? ''),
        equipment: equipmentList,
        muscleGroups,
      });
    }
    return items;
  }
}

function clampInt(n: number | undefined, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? Math.floor(n) : NaN;
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}
