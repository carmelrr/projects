import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ComplianceService {
  constructor(private firebase: FirebaseService) {}

  async calculateCompliance(clientId: string, orgId: string, periodStart: Date, periodEnd: Date) {
    const snap = await this.firebase
      .workoutInstances(orgId)
      .where('clientUserId', '==', clientId)
      .where('scheduledDate', '>=', periodStart.toISOString())
      .where('scheduledDate', '<=', periodEnd.toISOString())
      .get();

    const instances = snap.docs.map(d => d.data());
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
    const snap = await this.firebase
      .complianceSummaries(orgId)
      .where('clientUserId', '==', clientId)
      .orderBy('periodStart', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
