import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

interface CreateMetricDefinitionInput {
  name: string;
  unit: string;
  targetType?: string;
  frequency?: string;
}

interface LogMetricInput {
  metricId: string;
  value: number;
  notes?: string;
  source?: string;
  capturedAt?: string;
}

@Injectable()
export class MetricsService {
  constructor(private firebase: FirebaseService) {}

  async listDefinitions(orgId: string) {
    const snap = await this.firebase.metricDefinitions(orgId).orderBy('name', 'asc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createDefinition(orgId: string, input: CreateMetricDefinitionInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    const data = {
      orgId,
      name: input.name,
      unit: input.unit,
      targetType: input.targetType ?? 'HIGHER_IS_BETTER',
      frequency: input.frequency || null,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.firebase.metricDefinitions(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async updateDefinition(id: string, orgId: string, data: Partial<CreateMetricDefinitionInput>) {
    const doc = await this.firebase.metricDefinitions(orgId).doc(id).get();
    if (!doc.exists || doc.data()!.isSystem) throw new NotFoundException('Metric definition not found or not editable');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.unit !== undefined) update.unit = data.unit;
    if (data.targetType !== undefined) update.targetType = data.targetType;
    if (data.frequency !== undefined) update.frequency = data.frequency;

    await this.firebase.metricDefinitions(orgId).doc(id).update(update);
    return { id, ...doc.data(), ...update };
  }

  async logMetric(clientId: string, orgId: string, input: LogMetricInput) {
    // Verify metric belongs to org
    const metricDoc = await this.firebase.metricDefinitions(orgId).doc(input.metricId).get();
    if (!metricDoc.exists) throw new NotFoundException('Metric definition not found');

    // Verify client belongs to org
    const userDoc = await this.firebase.users().doc(clientId).get();
    if (!userDoc.exists) throw new NotFoundException('Client not found');
    const user = userDoc.data()!;
    const inOrg = (user.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg || !user.clientProfile) throw new NotFoundException('Client not found');

    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    const data = {
      metricId: input.metricId,
      clientUserId: clientId,
      value: input.value,
      notes: input.notes || null,
      source: input.source ?? 'manual',
      capturedAt: input.capturedAt || now,
      createdAt: now,
    };

    await this.firebase.metricEntries(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async getHistory(
    clientId: string,
    orgId: string,
    metricId: string,
    query: { from?: string; to?: string; limit?: string },
  ) {
    // Avoid composite index (clientUserId + metricId + capturedAt): query
    // on equality filters only, then sort + filter by date in memory.
    const snap = await this.firebase
      .metricEntries(orgId)
      .where('clientUserId', '==', clientId)
      .where('metricId', '==', metricId)
      .get();

    let entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
    if (query.from) {
      entries = entries.filter(e => ((e.capturedAt as string | undefined) || '') >= query.from!);
    }
    if (query.to) {
      entries = entries.filter(e => ((e.capturedAt as string | undefined) || '') <= query.to!);
    }
    entries.sort((a, b) => ((b.capturedAt as string | undefined) || '').localeCompare((a.capturedAt as string | undefined) || ''));
    const limitNum = query.limit ? parseInt(query.limit, 10) : 100;
    return entries.slice(0, limitNum);
  }

  async getLatestMetrics(clientId: string, orgId: string) {
    const defSnap = await this.firebase.metricDefinitions(orgId).get();
    const definitions = defSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const latest = await Promise.all(
      definitions.map(async (def) => {
        // Avoid composite index: query by equality only, pick latest in memory.
        const entrySnap = await this.firebase
          .metricEntries(orgId)
          .where('clientUserId', '==', clientId)
          .where('metricId', '==', def.id)
          .get();

        let latestEntry: Record<string, unknown> | null = null;
        for (const d of entrySnap.docs) {
          const data = { id: d.id, ...d.data() } as Record<string, unknown>;
          if (!latestEntry || ((data.capturedAt as string | undefined) || '') > (((latestEntry.capturedAt as string | undefined) || ''))) {
            latestEntry = data;
          }
        }
        return { definition: def, latestEntry };
      }),
    );

    return latest;
  }
}
