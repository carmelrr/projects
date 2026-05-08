import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { AICacheService } from './ai-cache.service';
import { AI_PROVIDER, AIProvider, AISchemaProperty } from './providers/ai-provider.interface';

const EXERCISE_UNITS = [
  'REPS_WEIGHT',
  'REPS_ONLY',
  'TIME',
  'TIME_STOPWATCH',
  'TIME_COUNTDOWN',
  'DISTANCE',
  'CALORIES',
] as const;

const COMMON_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Resistance Band',
  'Medicine Ball',
  'Bench',
  'Rack',
  'Pull-up Bar',
  'TRX',
  'Box',
  'Sled',
  'Rope',
  'None',
];

export interface ExerciseAutofillInput {
  name: string;
  locale?: 'he' | 'en';
}

export interface ExerciseAutofillOutput {
  category: string;
  muscleGroups: string[];
  equipment: string[];
  defaultUnits: (typeof EXERCISE_UNITS)[number];
  description: string;
  instructions?: string;
  tags: string[];
  confidence: number;
  suggestionId?: string;
}

const SCHEMA: AISchemaProperty = {
  type: 'object',
  properties: {
    category: { type: 'string', description: 'Single category name from the allowed list.' },
    muscleGroups: {
      type: 'array',
      items: { type: 'string' },
      description: 'Primary muscle groups worked (subset of the allowed list).',
    },
    equipment: {
      type: 'array',
      items: { type: 'string' },
      description: 'Equipment required (subset of the common list).',
    },
    defaultUnits: { type: 'string', enum: [...EXERCISE_UNITS] },
    description: { type: 'string', description: 'One-sentence summary of the exercise.' },
    instructions: { type: 'string', description: 'Brief step-by-step coaching cues.' },
    tags: { type: 'array', items: { type: 'string' } },
    confidence: {
      type: 'number',
      description: '0..1 how confident the assistant is in the classification.',
    },
  },
  required: ['category', 'muscleGroups', 'equipment', 'defaultUnits', 'description', 'confidence'],
};

@Injectable()
export class AIExerciseService {
  constructor(
    @Inject(AI_PROVIDER) private provider: AIProvider,
    private cache: AICacheService,
    private exercises: ExercisesService,
  ) {}

  async autofill(
    orgId: string,
    coachId: string,
    input: ExerciseAutofillInput,
  ): Promise<ExerciseAutofillOutput> {
    if (!this.provider.isAvailable()) {
      throw new ServiceUnavailableException('AI provider not configured');
    }

    const [categories, muscleGroups] = await Promise.all([
      this.exercises.listCategories(orgId),
      this.exercises.listMuscleGroups(orgId),
    ]);

    const cacheInput = {
      name: input.name.trim().toLowerCase(),
      locale: input.locale ?? 'he',
      categories,
      muscleGroups,
    };
    const inputHash = this.cache.hashInput(cacheInput);

    const cached = await this.cache.getCached<ExerciseAutofillOutput>(
      orgId,
      'EXERCISE_AUTOFILL',
      inputHash,
    );
    if (cached) return cached;

    const locale = input.locale ?? 'he';
    const langInstruction =
      locale === 'he'
        ? 'Respond in Hebrew for description and instructions; keep enum values (category, muscleGroups, equipment, defaultUnits) in English exactly as listed.'
        : 'Respond in English.';

    const prompt = [
      `Exercise name: "${input.name}"`,
      ``,
      `Allowed categories (pick exactly one): ${categories.join(', ')}`,
      `Allowed muscle groups (pick 1–4 most relevant): ${muscleGroups.join(', ')}`,
      `Allowed equipment options (pick 0–3 most relevant): ${COMMON_EQUIPMENT.join(', ')}`,
      `Allowed defaultUnits values: ${EXERCISE_UNITS.join(', ')}`,
      ``,
      `Choose:`,
      `- defaultUnits = REPS_WEIGHT for typical strength exercises`,
      `- REPS_ONLY for bodyweight without external load tracking`,
      `- TIME / TIME_COUNTDOWN for plank, isometrics`,
      `- DISTANCE for runs/rows`,
      `- CALORIES only when the exercise is naturally measured in calories`,
      ``,
      `${langInstruction}`,
      ``,
      `Return JSON matching the schema. Do not invent values not in the allowed lists.`,
    ].join('\n');

    const result = await this.provider.generateStructured<ExerciseAutofillOutput>({
      system:
        'You are a strength & conditioning expert helping a coach classify exercises for a coaching app library.',
      prompt,
      responseSchema: SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    // Defensive sanitization — keep only allowed values
    const sanitized: ExerciseAutofillOutput = {
      category: pickAllowed(result.data.category, categories) ?? categories[0] ?? 'Strength',
      muscleGroups: filterAllowed(result.data.muscleGroups, muscleGroups).slice(0, 4),
      equipment: filterAllowed(result.data.equipment, COMMON_EQUIPMENT).slice(0, 3),
      defaultUnits: (EXERCISE_UNITS as readonly string[]).includes(result.data.defaultUnits)
        ? result.data.defaultUnits
        : 'REPS_WEIGHT',
      description: (result.data.description || '').trim().slice(0, 500),
      instructions: result.data.instructions?.trim().slice(0, 1500),
      tags: Array.isArray(result.data.tags) ? result.data.tags.slice(0, 6) : [],
      confidence: clamp01(result.data.confidence),
    };

    const suggestionId = await this.cache.store({
      type: 'EXERCISE_AUTOFILL',
      inputHash,
      input: cacheInput,
      output: sanitized,
      model: result.model,
      orgId,
      coachId,
      tokensIn: result.usage?.inputTokens,
      tokensOut: result.usage?.outputTokens,
    });

    return { ...sanitized, suggestionId };
  }
}

function pickAllowed(value: string, allowed: string[]): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  const match = allowed.find((a) => a.toLowerCase() === lower);
  return match ?? null;
}

function filterAllowed(values: string[] | undefined, allowed: string[]): string[] {
  if (!Array.isArray(values)) return [];
  const lowerAllowed = new Map(allowed.map((a) => [a.toLowerCase(), a]));
  const out: string[] = [];
  for (const v of values) {
    const m = lowerAllowed.get(String(v).toLowerCase());
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
