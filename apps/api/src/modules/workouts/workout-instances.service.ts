import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class WorkoutInstancesService {
  constructor(private firebase: FirebaseService) {}

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
        const sd = (i.scheduledDate as string | undefined) || '';
        return sd >= startDate && sd <= endDate;
      });
    items.sort((a, b) => ((a.scheduledDate as string | undefined) || '').localeCompare((b.scheduledDate as string | undefined) || ''));
    return items;
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
        (instance as Record<string, unknown>).template = {
          id: tplDoc.id,
          ...tplData,
          items: effectiveItems,
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

    const data = {
      clientUserId: input.clientId,
      templateId: input.templateId,
      scheduledDate: input.scheduledDate,
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

    await this.firebase.workoutInstances(orgId).doc(id).update({
      movedFromDate: instance.scheduledDate,
      scheduledDate: newDate,
      updatedAt: new Date().toISOString(),
    });

    return { id, ...instance, movedFromDate: instance.scheduledDate, scheduledDate: newDate };
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
      overallRpe?: number;
      notes?: string;
      items?: Array<{
        exerciseId: string;
        sets: Array<{
          setIndex: number;
          reps?: number;
          weight?: number;
          duration?: number;
          rpe?: number;
          completed: boolean;
        }>;
      }>;
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
      overallRpe: body.overallRpe ?? null,
      notes: body.notes ?? null,
      items: body.items ?? [],
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
