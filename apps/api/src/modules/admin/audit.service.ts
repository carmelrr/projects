import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export interface AuditLogInput {
  orgId: string;
  actorUserId: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private firebase: FirebaseService) {}

  async log(input: AuditLogInput): Promise<void> {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    try {
      await this.firebase.auditLogs(input.orgId).doc(id).set({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? {},
        createdAt: now,
      });
    } catch {
      // Audit logging should never break a request; swallow errors.
    }
  }
}
