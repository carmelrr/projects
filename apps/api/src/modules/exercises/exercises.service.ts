import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface ListExercisesQuery {
  page?: string;
  limit?: string;
  category?: string;
  equipment?: string;
  muscleGroup?: string;
  search?: string;
  isSystem?: string;
}

interface CreateExerciseInput {
  name: string;
  description?: string;
  category: string;
  equipment?: string[];
  muscleGroups?: string[];
  defaultUnits?: string;
  tags?: string[];
  isPrBased?: boolean;
  difficulty?: string;
  instructions?: string;
  videoUrl?: string;
}

@Injectable()
export class ExercisesService {
  constructor(private firebase: FirebaseService) {}

  async listExercises(orgId: string, query: ListExercisesQuery) {
    const pagination = parsePagination(query);

    // Fetch both org-specific and system exercises
    const [orgSnap, sysSnap] = await Promise.all([
      query.isSystem === 'true' ? Promise.resolve(null) : this.firebase.orgExercises(orgId).get(),
      this.firebase.exercises().get(),
    ]);

    let exercises: Array<Record<string, unknown>> = [];

    // Add org exercises (unless filtering to system only)
    if (orgSnap) {
      for (const doc of orgSnap.docs) {
        exercises.push({ id: doc.id, ...doc.data() });
      }
    }

    // Add system exercises
    for (const doc of sysSnap.docs) {
      exercises.push({ id: doc.id, ...doc.data() });
    }

    // Apply filters in memory (Firestore can't do OR across collections)
    if (query.category) {
      exercises = exercises.filter(e => e.category === query.category);
    }
    if (query.equipment) {
      exercises = exercises.filter(e => Array.isArray(e.equipment) && (e.equipment as string[]).includes(query.equipment!));
    }
    if (query.muscleGroup) {
      exercises = exercises.filter(e => Array.isArray(e.muscleGroups) && (e.muscleGroups as string[]).includes(query.muscleGroup!));
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      exercises = exercises.filter(e => ((e.name as string) || '').toLowerCase().includes(s));
    }

    // Sort by name
    exercises.sort((a, b) => ((a.name as string) || '').localeCompare((b.name as string) || ''));

    const total = exercises.length;
    const paged = exercises.slice(pagination.skip, pagination.skip + pagination.limit);

    return paginatedResponse(paged, total, pagination);
  }

  async getExercise(id: string, orgId: string) {
    // Try org exercise first, then system
    let doc = await this.firebase.orgExercises(orgId).doc(id).get();
    if (!doc.exists) {
      doc = await this.firebase.exercises().doc(id).get();
    }
    if (!doc.exists) throw new NotFoundException('Exercise not found');
    return { id: doc.id, ...doc.data() };
  }

  private readonly DEFAULT_CATEGORIES = [
    'Strength', 'Cardio', 'Mobility', 'Plyometric',
    'Stretching', 'Balance', 'Olympic',
  ];

  async listCategories(orgId: string): Promise<string[]> {
    const snap = await this.firebase.orgExerciseCategories(orgId).orderBy('name').get();
    const custom = snap.docs.map((d) => (d.data() as { name: string }).name);
    return Array.from(new Set([...this.DEFAULT_CATEGORIES, ...custom])).sort();
  }

  async createCategory(orgId: string, name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name is required');
    const id = this.firebase.generateId();
    await this.firebase.orgExerciseCategories(orgId).doc(id).set({
      name: trimmed,
      orgId,
      createdAt: new Date().toISOString(),
    });
    return trimmed;
  }

  async createExercise(orgId: string, createdBy: string, input: CreateExerciseInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    const data = {
      orgId,
      name: input.name,
      description: input.description || null,
      instructions: input.instructions || null,
      category: input.category,
      equipment: input.equipment ?? [],
      muscleGroups: input.muscleGroups ?? [],
      defaultUnits: input.defaultUnits ?? 'REPS_WEIGHT',
      tags: input.tags ?? [],
      isPrBased: input.isPrBased ?? false,
      difficulty: input.difficulty ?? 'BEGINNER',
      videoUrl: input.videoUrl || null,
      isSystem: false,
      createdBy,
      createdAt: now,
      updatedAt: now,
      media: [],
    };

    await this.firebase.orgExercises(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async updateExercise(id: string, orgId: string, data: Partial<CreateExerciseInput>) {
    const doc = await this.firebase.orgExercises(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Exercise not found or not editable');
    const existing = doc.data()!;
    if (existing.isSystem) throw new NotFoundException('Exercise not found or not editable');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.category !== undefined) update.category = data.category;
    if (data.equipment !== undefined) update.equipment = data.equipment;
    if (data.muscleGroups !== undefined) update.muscleGroups = data.muscleGroups;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.isPrBased !== undefined) update.isPrBased = data.isPrBased;
    if (data.difficulty !== undefined) update.difficulty = data.difficulty;
    if (data.instructions !== undefined) update.instructions = data.instructions;
    if (data.videoUrl !== undefined) update.videoUrl = data.videoUrl;

    await this.firebase.orgExercises(orgId).doc(id).update(update);
    return { id, ...existing, ...update };
  }

  async deleteExercise(id: string, orgId: string): Promise<void> {
    const doc = await this.firebase.orgExercises(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Exercise not found or not deletable');
    const existing = doc.data()!;
    if (existing.isSystem) throw new NotFoundException('Exercise not found or not deletable');

    await this.firebase.orgExercises(orgId).doc(id).delete();
  }
}
