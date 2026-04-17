import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

interface HabitDefinitionInput {
  name: string;
  description?: string;
  frequency?: 'DAILY' | 'WEEKLY';
  target?: number;
  unit?: string;
  clientId?: string;
}

@Injectable()
export class HabitsService {
  constructor(private firebase: FirebaseService) {}

  // ── Definitions ──────────────────────────────────────────────────────────

  async listDefinitions(orgId: string, clientId?: string) {
    let q = this.firebase.habitDefinitions(orgId).orderBy('name', 'asc');
    const snap = await q.get();
    const defs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      clientId?: string;
      archived?: boolean;
      [k: string]: unknown;
    }>;
    return defs.filter(
      (d) =>
        !d.archived &&
        (!clientId || !d.clientId || d.clientId === clientId),
    );
  }

  async createDefinition(orgId: string, creatorId: string, input: HabitDefinitionInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    const data = {
      orgId,
      name: input.name,
      description: input.description ?? null,
      frequency: input.frequency ?? 'DAILY',
      target: input.target ?? 1,
      unit: input.unit ?? null,
      clientId: input.clientId ?? null,
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    await this.firebase.habitDefinitions(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async updateDefinition(id: string, orgId: string, data: Partial<HabitDefinitionInput> & { archived?: boolean }) {
    const doc = await this.firebase.habitDefinitions(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Habit not found');
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const k of ['name', 'description', 'frequency', 'target', 'unit', 'clientId', 'archived'] as const) {
      if (data[k] !== undefined) update[k] = data[k];
    }
    await this.firebase.habitDefinitions(orgId).doc(id).update(update);
    const fresh = await this.firebase.habitDefinitions(orgId).doc(id).get();
    return { id, ...fresh.data() };
  }

  async deleteDefinition(id: string, orgId: string) {
    await this.firebase.habitDefinitions(orgId).doc(id).update({
      archived: true,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  // ── Logs ─────────────────────────────────────────────────────────────────

  async logHabit(
    clientId: string,
    orgId: string,
    input: { habitId: string; date: string; value?: number; completed?: boolean; notes?: string },
  ) {
    const defDoc = await this.firebase.habitDefinitions(orgId).doc(input.habitId).get();
    if (!defDoc.exists) throw new NotFoundException('Habit not found');

    // Upsert by deterministic id = clientId_habitId_date
    const id = `${clientId}_${input.habitId}_${input.date}`;
    const now = new Date().toISOString();
    const target = (defDoc.data()?.target as number) ?? 1;
    const value = input.value ?? (input.completed ? target : 0);
    const completed = input.completed ?? value >= target;

    const data = {
      orgId,
      clientId,
      habitId: input.habitId,
      date: input.date,
      value,
      completed,
      notes: input.notes ?? null,
      updatedAt: now,
      createdAt: now,
    };

    const existing = await this.firebase.habitLogs(orgId).doc(id).get();
    if (existing.exists) {
      await this.firebase.habitLogs(orgId).doc(id).update({
        value,
        completed,
        notes: data.notes,
        updatedAt: now,
      });
    } else {
      await this.firebase.habitLogs(orgId).doc(id).set(data);
    }

    return { id, ...data };
  }

  async getLogs(
    clientId: string,
    orgId: string,
    filter: { date?: string; from?: string; to?: string },
  ) {
    let q = this.firebase.habitLogs(orgId).where('clientId', '==', clientId) as FirebaseFirestore.Query;
    if (filter.date) q = q.where('date', '==', filter.date);
    else {
      if (filter.from) q = q.where('date', '>=', filter.from);
      if (filter.to) q = q.where('date', '<=', filter.to);
    }
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async assertClientMatchesOrg(clientId: string, orgId: string) {
    const user = (await this.firebase.users().doc(clientId).get()).data();
    if (!user) throw new NotFoundException('Client not found');
    const inOrg = (user.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new ForbiddenException('Client not in this organization');
  }
}
