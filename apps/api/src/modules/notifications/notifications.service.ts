import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PushService } from './push.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface CreateNotificationInput {
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private firebase: FirebaseService,
    private push: PushService,
  ) {}

  async listNotifications(userId: string, query: { page?: string; limit?: string; unreadOnly?: string }) {
    const pagination = parsePagination(query);

    let q = this.firebase.notifications(userId).orderBy('createdAt', 'desc');

    if (query.unreadOnly === 'true') {
      q = q.where('readAt', '==', null);
    }

    const snap = await q.get();
    const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const total = notifications.length;
    const paged = notifications.slice(pagination.skip, pagination.skip + pagination.limit);

    return paginatedResponse(paged, total, pagination);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const snap = await this.firebase
      .notifications(userId)
      .where('readAt', '==', null)
      .get();
    return snap.size;
  }

  async markRead(id: string, userId: string) {
    const doc = await this.firebase.notifications(userId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Notification not found');

    const now = new Date().toISOString();
    await this.firebase.notifications(userId).doc(id).update({ readAt: now });
    return { id, ...doc.data(), readAt: now };
  }

  async markAllRead(userId: string) {
    const snap = await this.firebase
      .notifications(userId)
      .where('readAt', '==', null)
      .get();

    const batch = this.firebase.batch();
    const now = new Date().toISOString();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { readAt: now });
    }
    await batch.commit();
    return { success: true };
  }

  async createNotification(input: CreateNotificationInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const data = {
      userId: input.userId,
      orgId: input.orgId,
      type: input.type,
      title: input.title,
      body: input.body || null,
      data: input.data || {},
      channel: input.channel ?? 'IN_APP',
      sentAt: now,
      readAt: null,
      createdAt: now,
    };

    await this.firebase.notifications(input.userId).doc(id).set(data);

    // Respect user notification preferences (opt-out keys by type)
    const shouldPush = await this.shouldSendPush(input.userId, input.type);
    if (shouldPush) {
      this.push
        .sendToUser(input.userId, {
          title: input.title,
          body: input.body,
          data: { notificationId: id, type: input.type, ...(input.data ?? {}) },
        })
        .catch((err) => this.logger.error(`Push dispatch failed for ${input.userId}: ${(err as Error).message}`));
    }

    return { id, ...data };
  }

  private async shouldSendPush(userId: string, type: string): Promise<boolean> {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) return false;
    const prefs = (doc.data()?.notificationPrefs as Record<string, boolean>) || {};
    if (type === 'NEW_MESSAGE') return prefs.pushMessages !== false;
    if (type === 'WORKOUT_ASSIGNED' || type === 'WORKOUT_REMINDER') return prefs.pushReminders !== false;
    return true;
  }

  // Convenience methods for common notification types
  async notifyWorkoutAssigned(clientUserId: string, orgId: string, workoutTitle: string) {
    return this.createNotification({
      userId: clientUserId,
      orgId,
      type: 'WORKOUT_ASSIGNED',
      title: 'New Workout Assigned',
      body: `"${workoutTitle}" has been added to your schedule.`,
      data: {},
    });
  }

  async notifyLogSubmitted(coachUserId: string, orgId: string, clientName: string, workoutTitle: string) {
    return this.createNotification({
      userId: coachUserId,
      orgId,
      type: 'LOG_SUBMITTED',
      title: 'Workout Log Submitted',
      body: `${clientName} completed "${workoutTitle}".`,
      data: {},
    });
  }

  async notifyNewMessage(userId: string, orgId: string, senderName: string) {
    return this.createNotification({
      userId,
      orgId,
      type: 'NEW_MESSAGE',
      title: 'New Message',
      body: `${senderName} sent you a message.`,
      data: {},
    });
  }
}
