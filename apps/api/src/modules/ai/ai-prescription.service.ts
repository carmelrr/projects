import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { ExercisesService } from '../exercises/exercises.service';
import { FirebaseService } from '../firebase/firebase.service';
import { AICacheService } from './ai-cache.service';
import { AI_PROVIDER, AIProvider, AISchemaProperty } from './providers/ai-provider.interface';

export type PrescriptionGoal = 'STRENGTH' | 'HYPERTROPHY' | 'ENDURANCE' | 'WEIGHT_LOSS' | 'GENERAL';

export interface PrescriptionInput {
  exerciseId: string;
  clientId: string;
  goal?: PrescriptionGoal;
  context?: string;
  /** Coach explicitly opts in to send sanitized medicalNotes to the AI. */
  includeMedical?: boolean;
  locale?: 'he' | 'en';
}

export interface PrescriptionOutput {
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

interface ExerciseHistoryEntry {
  date: string;
  sets: Array<{ reps?: number; weight?: number; duration?: number }>;
}

const SCHEMA: AISchemaProperty = {
  type: 'object',
  properties: {
    sets: { type: 'integer', description: 'Number of working sets', nullable: true },
    reps: { type: 'string', description: 'Rep range like "8-10" or fixed "12"', nullable: true },
    weight: {
      type: 'object',
      nullable: true,
      properties: {
        type: { type: 'string', enum: ['absolute', 'percentage_1rm', 'rpe_target'] },
        value: { type: 'number' },
        unit: { type: 'string', enum: ['kg', 'lbs'], nullable: true },
      },
      required: ['type', 'value'],
    },
    rest: { type: 'integer', description: 'Rest in seconds between sets', nullable: true },
    tempo: { type: 'string', description: 'Tempo like "3-1-1-0"', nullable: true },
    duration: { type: 'integer', description: 'Work seconds when time-based', nullable: true },
    notes: { type: 'string', nullable: true },
    rationale: {
      type: 'string',
      description: 'Short explanation of why these numbers fit this client.',
    },
  },
  required: ['rationale'],
};

@Injectable()
export class AIPrescriptionService {
  constructor(
    @Inject(AI_PROVIDER) private provider: AIProvider,
    private cache: AICacheService,
    private clients: ClientsService,
    private exercises: ExercisesService,
    private firebase: FirebaseService,
  ) {}

  async suggest(
    orgId: string,
    coachId: string,
    input: PrescriptionInput,
  ): Promise<PrescriptionOutput> {
    if (!this.provider.isAvailable()) {
      throw new ServiceUnavailableException('AI provider not configured');
    }

    const [exercise, client] = await Promise.all([
      this.exercises.getExercise(input.exerciseId, orgId).catch(() => null),
      this.clients.getClient(input.clientId, orgId).catch(() => null),
    ]);
    if (!exercise) throw new NotFoundException('Exercise not found');
    if (!client) throw new NotFoundException('Client not found');

    const history = await this.fetchExerciseHistory(orgId, input.clientId, input.exerciseId);

    const e = exercise as Record<string, unknown>;
    const profile = sanitizeClient(client, input.includeMedical === true);

    const cacheInput = {
      exerciseId: input.exerciseId,
      clientId: input.clientId,
      goal: input.goal ?? 'GENERAL',
      context: (input.context ?? '').trim().slice(0, 500),
      defaultUnits: e['defaultUnits'],
      historyDigest: history.map((h) => ({
        date: h.date.slice(0, 10),
        sets: h.sets.length,
        topReps: Math.max(0, ...h.sets.map((s) => s.reps ?? 0)),
        topWeight: Math.max(0, ...h.sets.map((s) => s.weight ?? 0)),
        topDuration: Math.max(0, ...h.sets.map((s) => s.duration ?? 0)),
      })),
      profile,
      locale: input.locale ?? 'he',
    };
    const inputHash = this.cache.hashInput(cacheInput);

    const cached = await this.cache.getCached<PrescriptionOutput>(
      orgId,
      'PRESCRIPTION',
      inputHash,
    );
    if (cached) return cached;

    const locale = input.locale ?? 'he';
    const lang =
      locale === 'he'
        ? 'Write rationale and notes in concise Hebrew.'
        : 'Write rationale and notes in concise English.';

    const prompt = [
      `Exercise: ${e['name']} (units=${e['defaultUnits']}, muscles=${(e['muscleGroups'] as string[] | undefined)?.join('/') ?? '?'})`,
      `Goal: ${input.goal ?? 'GENERAL'}`,
      input.context ? `Coach note: ${input.context}` : '',
      ``,
      `Client profile:`,
      `- Age: ${profile.age ?? 'unknown'}`,
      `- Height: ${profile.heightCm ?? 'unknown'} cm`,
      `- Goals: ${profile.goals ?? 'unknown'}`,
      profile.medicalNotes ? `- Medical notes (handle with care): ${profile.medicalNotes}` : '',
      ``,
      history.length
        ? `Recent history (most recent first):\n${history
            .slice(0, 5)
            .map(
              (h) =>
                `  ${h.date.slice(0, 10)}: ${h.sets
                  .map(
                    (s) =>
                      [
                        s.reps != null ? `${s.reps} reps` : '',
                        s.weight != null ? `@${s.weight}` : '',
                        s.duration != null ? `${s.duration}s` : '',
                      ]
                        .filter(Boolean)
                        .join(' '),
                  )
                  .join(' | ')}`,
            )
            .join('\n')}`
        : `No prior logs for this exercise.`,
      ``,
      `Suggest a prescription (sets, reps, weight, rest, tempo, duration as appropriate to the units).`,
      `If the exercise is time-based (TIME, TIME_COUNTDOWN, TIME_STOPWATCH) prefer "duration" and skip "reps".`,
      `Use small progressive overload vs. recent history when available.`,
      `Use weight.type "absolute" with kg unless the client clearly trains in lbs.`,
      lang,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.provider.generateStructured<PrescriptionOutput>({
      system:
        'You are an experienced strength & conditioning coach prescribing safe, progressive workout parameters for an individual client.',
      prompt,
      responseSchema: SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 700,
    });

    const sanitized: PrescriptionOutput = sanitizePrescription(result.data);

    const suggestionId = await this.cache.store({
      type: 'PRESCRIPTION',
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

  private async fetchExerciseHistory(
    orgId: string,
    clientUserId: string,
    exerciseId: string,
  ): Promise<ExerciseHistoryEntry[]> {
    try {
      const snap = await this.firebase
        .workoutLogs(orgId)
        .where('clientUserId', '==', clientUserId)
        .orderBy('completedAt', 'desc')
        .limit(20)
        .get();

      const out: ExerciseHistoryEntry[] = [];
      for (const doc of snap.docs) {
        const data = doc.data() as {
          completedAt?: string;
          items?: Array<{
            exerciseId?: string;
            sets?: Array<{ reps?: number; weight?: number; duration?: number }>;
          }>;
        };
        const item = (data.items ?? []).find((it) => it.exerciseId === exerciseId);
        if (!item) continue;
        out.push({
          date: data.completedAt ?? '',
          sets: (item.sets ?? []).map((s) => ({
            reps: s.reps,
            weight: s.weight,
            duration: s.duration,
          })),
        });
        if (out.length >= 5) break;
      }
      return out;
    } catch {
      return [];
    }
  }
}

interface SanitizedClient {
  age?: number;
  heightCm?: number;
  goals?: string;
  medicalNotes?: string;
}

function sanitizeClient(client: unknown, includeMedical: boolean): SanitizedClient {
  const c = client as { dob?: string; heightCm?: number; goals?: string; medicalNotes?: string };
  const age = c.dob ? computeAge(c.dob) : undefined;
  return {
    age,
    heightCm: c.heightCm,
    goals: c.goals?.trim().slice(0, 300),
    medicalNotes: includeMedical ? c.medicalNotes?.trim().slice(0, 500) : undefined,
  };
}

function computeAge(dob: string): number | undefined {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function sanitizePrescription(data: PrescriptionOutput): PrescriptionOutput {
  const out: PrescriptionOutput = { rationale: (data.rationale || '').trim().slice(0, 500) };
  if (typeof data.sets === 'number' && Number.isFinite(data.sets)) {
    out.sets = Math.max(1, Math.min(20, Math.floor(data.sets)));
  }
  if (typeof data.reps === 'string' && data.reps.trim()) {
    out.reps = data.reps.trim().slice(0, 20);
  }
  if (data.weight && typeof data.weight === 'object') {
    const w = data.weight;
    if (
      ['absolute', 'percentage_1rm', 'rpe_target'].includes(w.type) &&
      typeof w.value === 'number' &&
      Number.isFinite(w.value)
    ) {
      out.weight = {
        type: w.type,
        value: Math.max(0, Math.min(1000, w.value)),
        ...(w.unit === 'lbs' || w.unit === 'kg' ? { unit: w.unit } : {}),
      };
    }
  }
  if (typeof data.rest === 'number' && Number.isFinite(data.rest)) {
    out.rest = Math.max(0, Math.min(900, Math.floor(data.rest)));
  }
  if (typeof data.tempo === 'string' && data.tempo.trim()) {
    out.tempo = data.tempo.trim().slice(0, 12);
  }
  if (typeof data.duration === 'number' && Number.isFinite(data.duration)) {
    out.duration = Math.max(0, Math.min(3600, Math.floor(data.duration)));
  }
  if (typeof data.notes === 'string' && data.notes.trim()) {
    out.notes = data.notes.trim().slice(0, 400);
  }
  return out;
}
