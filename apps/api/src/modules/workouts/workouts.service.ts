import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface CreateWorkoutInput {
  title: string;
  description?: string;
  type?: string;
  estimatedDuration?: number;
  instructions?: string;
  tags?: string[];
  items?: {
    exerciseId: string;
    orderIndex: number;
    groupLabel?: string;
    prescription: Record<string, unknown>;
    coachNotes?: string;
  }[];
}

@Injectable()
export class WorkoutsService {
  constructor(private firebase: FirebaseService) {}

  async listWorkouts(orgId: string, query: { page?: string; limit?: string; search?: string; type?: string }) {
    const pagination = parsePagination(query);

    let snap = await this.firebase.workouts(orgId).where('isTemplate', '==', true).orderBy('updatedAt', 'desc').get();

    let workouts: Array<Record<string, unknown>> = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (query.search) {
      const s = query.search.toLowerCase();
      workouts = workouts.filter(w => ((w.title as string) || '').toLowerCase().includes(s));
    }
    if (query.type) {
      workouts = workouts.filter(w => w.type === query.type);
    }

    const total = workouts.length;
    const paged = workouts.slice(pagination.skip, pagination.skip + pagination.limit);

    return paginatedResponse(paged, total, pagination);
  }

  async getWorkout(id: string, orgId: string) {
    const doc = await this.firebase.workouts(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout not found');
    return { id: doc.id, ...doc.data() };
  }

  async createWorkout(orgId: string, createdBy: string, input: CreateWorkoutInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const items = (input.items || []).map(item => ({
      id: this.firebase.generateId(),
      exerciseId: item.exerciseId,
      orderIndex: item.orderIndex,
      groupLabel: item.groupLabel || null,
      prescription: item.prescription,
      coachNotes: item.coachNotes || null,
    }));

    const data = {
      orgId,
      title: input.title,
      description: input.description || null,
      type: input.type ?? 'STRENGTH',
      estimatedDuration: input.estimatedDuration || null,
      instructions: input.instructions || null,
      tags: input.tags ?? [],
      createdBy,
      isTemplate: true,
      items,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.workouts(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async updateWorkout(id: string, orgId: string, data: Partial<Omit<CreateWorkoutInput, 'items'>>) {
    const doc = await this.firebase.workouts(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout not found');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.type !== undefined) update.type = data.type;
    if (data.estimatedDuration !== undefined) update.estimatedDuration = data.estimatedDuration;
    if (data.instructions !== undefined) update.instructions = data.instructions;
    if (data.tags !== undefined) update.tags = data.tags;

    await this.firebase.workouts(orgId).doc(id).update(update);
    return { id, ...doc.data(), ...update };
  }

  async updateWorkoutItems(
    workoutId: string,
    orgId: string,
    items: { exerciseId: string; orderIndex: number; groupLabel?: string; prescription: Record<string, unknown>; coachNotes?: string }[],
  ) {
    const doc = await this.firebase.workouts(orgId).doc(workoutId).get();
    if (!doc.exists) throw new NotFoundException('Workout not found');

    const newItems = items.map(item => ({
      id: this.firebase.generateId(),
      exerciseId: item.exerciseId,
      orderIndex: item.orderIndex,
      groupLabel: item.groupLabel || null,
      prescription: item.prescription,
      coachNotes: item.coachNotes || null,
    }));

    await this.firebase.workouts(orgId).doc(workoutId).update({
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.firebase.workouts(orgId).doc(workoutId).get();
    return { id: workoutId, ...updated.data() };
  }

  async duplicateWorkout(id: string, orgId: string, userId: string) {
    const doc = await this.firebase.workouts(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout not found');
    const workout = doc.data()!;

    const newId = this.firebase.generateId();
    const now = new Date().toISOString();

    const newItems = ((workout.items as Array<Record<string, unknown>>) || []).map(item => ({
      ...item,
      id: this.firebase.generateId(),
    }));

    const newData = {
      ...workout,
      title: `Copy of ${workout.title}`,
      createdBy: userId,
      items: newItems,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.workouts(orgId).doc(newId).set(newData);
    return { id: newId, ...newData };
  }

  async deleteWorkout(id: string, orgId: string): Promise<void> {
    const doc = await this.firebase.workouts(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout not found');
    await this.firebase.workouts(orgId).doc(id).delete();
  }
}
