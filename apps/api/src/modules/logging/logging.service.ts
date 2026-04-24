import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface CreateWorkoutLogInput {
  workoutInstanceId: string;
  startedAt: string;
  finishedAt?: string;
  clientNotes?: string;
  sets: {
    itemId: string;
    setNumber: number;
    reps?: number;
    weight?: number;
    time?: number;
    distance?: number;
    calories?: number;
    restSeconds?: number;
    notes?: string;
  }[];
}

@Injectable()
export class LoggingService {
  constructor(private firebase: FirebaseService) {}

  /** We need the orgId to locate the right subcollection. The caller (controller) should provide it. */
  async submitLog(clientId: string, orgId: string, input: CreateWorkoutLogInput) {
    // Idempotency: check if log already exists for this instance
    const existingSnap = await this.firebase
      .workoutLogs(orgId)
      .where('instanceId', '==', input.workoutInstanceId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // Validate instance belongs to this client
    const instDoc = await this.firebase.workoutInstances(orgId).doc(input.workoutInstanceId).get();
    if (!instDoc.exists || instDoc.data()!.clientUserId !== clientId) {
      throw new NotFoundException('Workout instance not found');
    }

    const batch = this.firebase.batch();
    const logId = this.firebase.generateId();
    const now = new Date().toISOString();

    const setLogs = input.sets.map(set => ({
      id: this.firebase.generateId(),
      itemId: set.itemId,
      setNumber: set.setNumber,
      reps: set.reps ?? null,
      weight: set.weight ?? null,
      time: set.time ?? null,
      distance: set.distance ?? null,
      calories: set.calories ?? null,
      restSeconds: set.restSeconds ?? null,
      notes: set.notes ?? null,
    }));

    const logData = {
      clientUserId: clientId,
      instanceId: input.workoutInstanceId,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt || null,
      clientNotes: input.clientNotes || null,
      setLogs,
      coachFeedback: null,
      coachFeedbackAt: null,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(this.firebase.workoutLogs(orgId).doc(logId), logData);

    // Mark instance as completed
    batch.update(this.firebase.workoutInstances(orgId).doc(input.workoutInstanceId), {
      status: 'COMPLETED',
      updatedAt: now,
    });

    await batch.commit();
    return { id: logId, ...logData };
  }

  async getLog(logId: string, orgId: string) {
    const doc = await this.firebase.workoutLogs(orgId).doc(logId).get();
    if (!doc.exists) throw new NotFoundException('Workout log not found');
    return { id: doc.id, ...doc.data() };
  }

  async listClientLogs(clientId: string, orgId: string, query: { page?: string; limit?: string }) {
    // Verify client
    const userDoc = await this.firebase.users().doc(clientId).get();
    if (!userDoc.exists) throw new NotFoundException('Client not found');

    const pagination = parsePagination(query);

    // Avoid composite index (clientUserId + createdAt): sort in memory.
    const snap = await this.firebase
      .workoutLogs(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
    logs.sort((a, b) => ((b.createdAt as string | undefined) || '').localeCompare((a.createdAt as string | undefined) || ''));
    const total = logs.length;
    const paged = logs.slice(pagination.skip, pagination.skip + pagination.limit);

    return paginatedResponse(paged, total, pagination);
  }

  async addFeedback(logId: string, orgId: string, feedback: string) {
    const doc = await this.firebase.workoutLogs(orgId).doc(logId).get();
    if (!doc.exists) throw new NotFoundException('Workout log not found');

    const now = new Date().toISOString();
    await this.firebase.workoutLogs(orgId).doc(logId).update({
      coachFeedback: feedback,
      coachFeedbackAt: now,
      updatedAt: now,
    });

    return { id: logId, ...doc.data(), coachFeedback: feedback, coachFeedbackAt: now };
  }

  async getExerciseHistory(clientId: string, orgId: string, exerciseId: string, limit = 10) {
    // Get all logs for this client
    const snap = await this.firebase
      .workoutLogs(orgId)
      .where('clientUserId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(50) // fetch enough to find sets for this exercise
      .get();

    const results: Array<Record<string, unknown>> = [];

    for (const doc of snap.docs) {
      const logData = doc.data();
      const setLogs = (logData.setLogs as Array<Record<string, unknown>>) || [];
      // Filter sets that match the exerciseId (via itemId referencing the exercise)
      // Since we embed sets directly, we need to check if any set's itemId corresponds to this exercise
      for (const set of setLogs) {
        results.push({
          ...set,
          workoutLog: { createdAt: logData.createdAt },
        });
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    return results;
  }
}
