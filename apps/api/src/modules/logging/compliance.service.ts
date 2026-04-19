import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ComplianceService {
  constructor(private firebase: FirebaseService) {}

  async calculateCompliance(clientId: string, orgId: string, periodStart: Date, periodEnd: Date) {
    // Avoid requiring a composite index (clientUserId + scheduledDate):
    // query by clientUserId only, filter by date in memory.
    const snap = await this.firebase
      .workoutInstances(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    const startIso = periodStart.toISOString();
    const endIso = periodEnd.toISOString();
    const instances = snap.docs
      .map(d => d.data())
      .filter(i => typeof i.scheduledDate === 'string' && i.scheduledDate >= startIso && i.scheduledDate <= endIso);
    const totalScheduled = instances.length;
    const totalCompleted = instances.filter(i => i.status === 'COMPLETED').length;
    const complianceRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;
    const needsAttention = complianceRate < 0.6 && totalScheduled >= 3;

    const summaryId = `${clientId}_${periodStart.toISOString().slice(0, 10)}`;
    const now = new Date().toISOString();

    const data = {
      clientUserId: clientId,
      period: 'SEVEN_DAY',
      periodStart: periodStart.toISOString(),
      totalScheduled,
      totalCompleted,
      complianceRate,
      needsAttention,
      calculatedAt: now,
      updatedAt: now,
    };

    await this.firebase.complianceSummaries(orgId).doc(summaryId).set(data, { merge: true });
    return { id: summaryId, ...data };
  }

  async getClientCompliance(clientId: string, orgId: string, limit = 12) {
    // Avoid composite index (clientUserId + periodStart): sort in memory.
    const snap = await this.firebase
      .complianceSummaries(orgId)
      .where('clientUserId', '==', clientId)
      .get();

    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
    items.sort((a, b) => ((b.periodStart as string | undefined) || '').localeCompare((a.periodStart as string | undefined) || ''));
    return items.slice(0, limit);
  }
}
