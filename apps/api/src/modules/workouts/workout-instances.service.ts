import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class WorkoutInstancesService {
  constructor(private firebase: FirebaseService) {}

  private isoDay(value: string): string {
    return value.split('T')[0];
  }

  private async getNextDayOrder(clientId: string, orgId: string, day: string): Promise<number> {
    const snap = await this.firebase
      .workoutInstances(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    const maxOrder = snap.docs
      .map((doc) => doc.data())
      .filter((it) => this.isoDay(String(it.scheduledDate ?? '')) === day)
      .reduce((acc, it) => {
        const n = typeof it.dayOrder === 'number' ? it.dayOrder : 0;
        return Math.max(acc, n);
      }, -1);

    return maxOrder + 1;
  }

  async getClientCalendar(clientId: string, orgId: string, startDate: string, endDate: string) {
    // Verify client belongs to org
    const userDoc = await this.firebase.users().doc(clientId).get();
    if (!userDoc.exists) throw new NotFoundException('Client not found');
    const user = userDoc.data()!;
    const inOrg = (user.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg || !user.clientProfile) throw new NotFoundException('Client not found');

    // Avoid composite index (clientUserId + scheduledDate): query by
    // clientUserId only, filter+sort scheduledDate in memory.
    const snap = await this.firebase
      .workoutInstances(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    const items = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>))
      .filter(i => {
        const sd = this.isoDay((i.scheduledDate as string | undefined) || '');
        return sd >= startDate && sd <= endDate;
      });
    items.sort((a, b) => {
      const byDate = ((a.scheduledDate as string | undefined) || '').localeCompare((b.scheduledDate as string | undefined) || '');
      if (byDate !== 0) return byDate;
      const aOrder = typeof a.dayOrder === 'number' ? a.dayOrder : 0;
      const bOrder = typeof b.dayOrder === 'number' ? b.dayOrder : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return ((a.createdAt as string | undefined) || '').localeCompare((b.createdAt as string | undefined) || '');
    });

    // Hydrate a lightweight `summary` for each instance so list cards
    // (Today/Upcoming) can render title/count/duration without each client
    // doing N detail fetches. Templates are batched + de-duped.
    const templateIds = Array.from(
      new Set(
        items
          .map((i) => i.templateId)
          .filter((id): id is string => typeof id === 'string' && !!id),
      ),
    );
    const templateMap = new Map<string, Record<string, unknown>>();
    await Promise.all(
      templateIds.map(async (tid) => {
        const tplDoc = await this.firebase.workouts(orgId).doc(tid).get();
        if (tplDoc.exists) templateMap.set(tid, tplDoc.data() as Record<string, unknown>);
      }),
    );

    // Collect exerciseIds across all referenced templates so we can resolve
    // `primaryMuscleGroups` once per call.
    const exerciseIds = new Set<string>();
    for (const tpl of templateMap.values()) {
      const tplItems = (tpl.items as Array<Record<string, unknown>> | undefined) ?? [];
      for (const it of tplItems) {
        const kind = (it.kind as string | undefined) ?? 'EXERCISE';
        if (kind === 'EXERCISE' && typeof it.exerciseId === 'string') {
          exerciseIds.add(it.exerciseId);
        }
      }
    }
    const exerciseMuscles = new Map<string, string[]>();
    await Promise.all(
      Array.from(exerciseIds).map(async (exId) => {
        let snap = await this.firebase.orgExercises(orgId).doc(exId).get();
        if (!snap.exists) snap = await this.firebase.exercises().doc(exId).get();
        if (snap.exists) {
          const data = snap.data() as Record<string, unknown>;
          const groups = Array.isArray(data.muscleGroups)
            ? (data.muscleGroups as string[])
            : [];
          exerciseMuscles.set(exId, groups);
        }
      }),
    );

    return items.map((instance) => {
      const tplId = instance.templateId as string | undefined;
      const tpl = tplId ? templateMap.get(tplId) : undefined;
      if (!tpl) return instance;
      const tplItems = (tpl.items as Array<Record<string, unknown>> | undefined) ?? [];
      const blockKinds = Array.from(
        new Set(
          tplItems.map(
            (it) => (it.kind as string | undefined) ?? 'EXERCISE',
          ),
        ),
      );
      const muscleSet = new Set<string>();
      for (const it of tplItems) {
        const kind = (it.kind as string | undefined) ?? 'EXERCISE';
        if (kind !== 'EXERCISE') continue;
        const groups = exerciseMuscles.get(it.exerciseId as string) ?? [];
        for (const g of groups) muscleSet.add(g);
      }
      const summary = {
        title: (tpl.title as string | undefined) ?? null,
        type: (tpl.type as string | undefined) ?? null,
        estimatedDuration: (tpl.estimatedDuration as number | undefined) ?? null,
        itemCount: tplItems.length,
        blockKinds,
        primaryMuscleGroups: Array.from(muscleSet).slice(0, 3),
      };
      return { ...instance, summary };
    });
  }

  async getInstance(id: string, orgId: string) {
    const doc = await this.firebase.workoutInstances(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    const instance = { id: doc.id, ...doc.data() };

    // Fetch overrides (per-client, per-instance prescriptions)
    const overrideDoc = await this.firebase.workoutInstanceOverrides(orgId).doc(id).get();
    const overrides: Record<string, { prescription: Record<string, unknown> }> =
      overrideDoc.exists ? (overrideDoc.data()?.overrides ?? {}) : {};

    // If there's a template, fetch it
    const data = doc.data()!;
    if (data.templateId) {
      const tplDoc = await this.firebase.workouts(orgId).doc(data.templateId).get();
      if (tplDoc.exists) {
        const tplData = tplDoc.data()!;
        // Apply overrides to template items
        const items = (tplData.items ?? []) as Array<Record<string, unknown>>;
        const effectiveItems = items.map((item) => {
          const override = overrides[item.exerciseId as string];
          if (!override) return item;
          return {
            ...item,
            prescription: { ...(item.prescription as object), ...override.prescription },
            _hasOverride: true,
          };
        });

        // Hydrate exercise details (name/videoUrl/etc.) so the client UI
        // can render the workout runner without N+1 fetches.
        const exerciseIds = Array.from(
          new Set(
            effectiveItems
              .map((it) => it.exerciseId)
              .filter((x): x is string => typeof x === 'string'),
          ),
        );
        const exerciseById = new Map<string, Record<string, unknown>>();
        await Promise.all(
          exerciseIds.map(async (exId) => {
            let snap = await this.firebase.orgExercises(orgId).doc(exId).get();
            if (!snap.exists) snap = await this.firebase.exercises().doc(exId).get();
            if (snap.exists) exerciseById.set(exId, { id: snap.id, ...snap.data() });
          }),
        );

        const hydratedItems = effectiveItems.map((it) => {
          const ex = exerciseById.get(it.exerciseId as string);
          if (!ex) return it;
          return {
            ...it,
            exercise: {
              id: ex.id,
              name: ex.name,
              category: ex.category,
              muscleGroups: ex.muscleGroups,
              equipment: ex.equipment,
              videoUrl: ex.videoUrl,
              isPrBased: ex.isPrBased ?? false,
            },
          };
        });

        (instance as Record<string, unknown>).template = {
          id: tplDoc.id,
          ...tplData,
          items: hydratedItems,
        };
      }
    }

    // Fetch log if exists
    const logSnap = await this.firebase
      .workoutLogs(orgId)
      .where('instanceId', '==', id)
      .limit(1)
      .get();

    if (!logSnap.empty) {
      const logDoc = logSnap.docs[0];
      (instance as Record<string, unknown>).log = { id: logDoc.id, ...logDoc.data() };
    }

    return instance;
  }

  async setInstanceOverride(
    instanceId: string,
    orgId: string,
    exerciseId: string,
    prescription: Record<string, unknown>,
    modifiedBy: string,
  ) {
    // Verify instance exists
    const doc = await this.firebase.workoutInstances(orgId).doc(instanceId).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    const now = new Date().toISOString();
    const overrideRef = this.firebase.workoutInstanceOverrides(orgId).doc(instanceId);
    const existing = await overrideRef.get();

    const override = { prescription, modifiedBy, modifiedAt: now };

    if (existing.exists) {
      await overrideRef.update({
        [`overrides.${exerciseId}`]: override,
        updatedAt: now,
      });
    } else {
      await overrideRef.set({
        instanceId,
        orgId,
        overrides: { [exerciseId]: override },
        createdAt: now,
        updatedAt: now,
      });
    }

    return { instanceId, exerciseId, prescription, modifiedBy, modifiedAt: now };
  }

  async scheduleWorkout(orgId: string, input: { clientId: string; templateId: string; scheduledDate: string; title?: string; notes?: string }) {
    // Verify client
    const userDoc = await this.firebase.users().doc(input.clientId).get();
    if (!userDoc.exists) throw new NotFoundException('Client not found');
    const user = userDoc.data()!;
    const inOrg = (user.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg || !user.clientProfile) throw new NotFoundException('Client not found');

    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const day = this.isoDay(input.scheduledDate);
    const dayOrder = await this.getNextDayOrder(input.clientId, orgId, day);

    const data = {
      clientUserId: input.clientId,
      templateId: input.templateId,
      scheduledDate: input.scheduledDate,
      dayOrder,
      title: input.title || null,
      notes: input.notes || null,
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.workoutInstances(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async moveInstance(id: string, orgId: string, newDate: string) {
    const doc = await this.firebase.workoutInstances(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    const instance = doc.data()!;
    if (instance.status !== 'SCHEDULED') {
      throw new ForbiddenException('Can only move scheduled workouts');
    }

    const dayOrder = await this.getNextDayOrder(instance.clientUserId, orgId, this.isoDay(newDate));

    await this.firebase.workoutInstances(orgId).doc(id).update({
      movedFromDate: instance.scheduledDate,
      scheduledDate: newDate,
      dayOrder,
      updatedAt: new Date().toISOString(),
    });

    return { id, ...instance, movedFromDate: instance.scheduledDate, scheduledDate: newDate, dayOrder };
  }

  async reorderDayInstances(
    clientId: string,
    orgId: string,
    day: string,
    orderedInstanceIds: string[],
  ) {
    const snap = await this.firebase
      .workoutInstances(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    type DayItem = { id: string } & Record<string, unknown>;
    const dayItems: DayItem[] = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as DayItem))
      .filter((it) => this.isoDay(String(it.scheduledDate ?? '')) === day);

    const byId = new Map<string, DayItem>(dayItems.map((it) => [it.id, it]));

    if (orderedInstanceIds.some((id) => !byId.has(id))) {
      throw new NotFoundException('One or more workout instances were not found for this day');
    }

    const now = new Date().toISOString();
    const batch = this.firebase.batch();

    orderedInstanceIds.forEach((id, index) => {
      batch.update(this.firebase.workoutInstances(orgId).doc(id), {
        dayOrder: index,
        updatedAt: now,
      });
    });

    const tail = Array.from(byId.values())
      .filter((it) => !orderedInstanceIds.includes(it.id))
      .sort((a, b) => {
        const aOrder = typeof a.dayOrder === 'number' ? a.dayOrder : 0;
        const bOrder = typeof b.dayOrder === 'number' ? b.dayOrder : 0;
        return aOrder - bOrder;
      });

    tail.forEach((it, offset) => {
      batch.update(this.firebase.workoutInstances(orgId).doc(it.id), {
        dayOrder: orderedInstanceIds.length + offset,
        updatedAt: now,
      });
    });

    await batch.commit();
    return { clientId, date: day, orderedInstanceIds };
  }

  async skipInstance(id: string, orgId: string) {
    const doc = await this.firebase.workoutInstances(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    await this.firebase.workoutInstances(orgId).doc(id).update({
      status: 'SKIPPED',
      updatedAt: new Date().toISOString(),
    });

    return { id, ...doc.data(), status: 'SKIPPED' };
  }

  async deleteInstance(id: string, orgId: string): Promise<void> {
    const doc = await this.firebase.workoutInstances(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    const instance = doc.data()!;
    if (instance.status === 'COMPLETED') {
      throw new ForbiddenException('Cannot delete a completed workout');
    }

    await this.firebase.workoutInstances(orgId).doc(id).delete();
  }

  async submitLog(
    instanceId: string,
    orgId: string,
    clientUserId: string,
    body: {
      durationMinutes?: number;
      notes?: string;
      items?: Array<{
        exerciseId: string;
        sets: Array<{
          setIndex: number;
          reps?: number;
          weight?: number;
          duration?: number;
          restSeconds?: number;
          completed: boolean;
        }>;
      }>;
      /** Per-block completion flags for non-exercise blocks (timer/note). */
      blockCompletions?: Record<
        string,
        { kind: 'INTERVAL_TIMER' | 'NOTE'; totalWorkSec?: number }
      >;
    },
  ) {
    const doc = await this.firebase.workoutInstances(orgId).doc(instanceId).get();
    if (!doc.exists) throw new NotFoundException('Workout instance not found');

    const instance = doc.data()!;
    if (instance.clientUserId !== clientUserId) {
      throw new ForbiddenException('Cannot log a workout for another client');
    }

    const now = new Date().toISOString();
    const logId = this.firebase.generateId();

    const logData = {
      instanceId,
      clientUserId,
      orgId,
      durationMinutes: body.durationMinutes ?? null,
      notes: body.notes ?? null,
      items: body.items ?? [],
      blockCompletions: body.blockCompletions ?? {},
      completedAt: now,
      createdAt: now,
    };

    const batch = this.firebase.batch();
    // Write log
    batch.set(this.firebase.workoutLogs(orgId).doc(logId), logData);
    // Mark instance as completed
    batch.update(this.firebase.workoutInstances(orgId).doc(instanceId), {
      status: 'COMPLETED',
      completedAt: now,
      updatedAt: now,
    });
    await batch.commit();

    return { id: logId, ...logData };
  }
}
