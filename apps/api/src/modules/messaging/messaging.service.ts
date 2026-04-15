import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class MessagingService {
  constructor(private firebase: FirebaseService) {}

  async listThreads(userId: string, orgId: string) {
    // Query threads where this user is a participant
    const snap = await this.firebase
      .threads(orgId)
      .where('participantIds', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    const threads: Array<Record<string, unknown>> = [];

    for (const doc of snap.docs) {
      const thread = doc.data();

      // Get last message from subcollection
      const msgSnap = await this.firebase
        .messages(orgId, doc.id)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      const lastMessage = msgSnap.empty ? null : { id: msgSnap.docs[0].id, ...msgSnap.docs[0].data() };

      // Calculate unread count
      const participants = (thread.participants as Array<Record<string, unknown>>) || [];
      const myEntry = participants.find((p: Record<string, unknown>) => p.userId === userId);
      const lastReadAt = myEntry?.lastReadAt as string | undefined;

      let unreadCount = 0;
      if (lastReadAt) {
        const unreadSnap = await this.firebase
          .messages(orgId, doc.id)
          .where('createdAt', '>', lastReadAt)
          .get();
        unreadCount = unreadSnap.docs.filter(m => m.data().senderId !== userId && !m.data().deletedAt).length;
      } else {
        const allSnap = await this.firebase
          .messages(orgId, doc.id)
          .where('senderId', '!=', userId)
          .get();
        unreadCount = allSnap.docs.filter(m => !m.data().deletedAt).length;
      }

      threads.push({
        id: doc.id,
        ...thread,
        lastMessage,
        unreadCount,
      });
    }

    return threads;
  }

  async getOrCreateDirectThread(orgId: string, userId: string, otherUserId: string) {
    // Find existing direct thread between these two users
    const snap = await this.firebase
      .threads(orgId)
      .where('type', '==', 'DIRECT')
      .where('participantIds', 'array-contains', userId)
      .get();

    const existingThread = snap.docs.find(doc => {
      const data = doc.data();
      const ids = (data.participantIds as string[]) || [];
      return ids.includes(otherUserId);
    });

    if (existingThread) {
      return { id: existingThread.id, ...existingThread.data() };
    }

    // Create new direct thread
    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const data = {
      orgId,
      type: 'DIRECT',
      createdBy: userId,
      participantIds: [userId, otherUserId],
      participants: [
        { userId, role: 'member', lastReadAt: null },
        { userId: otherUserId, role: 'member', lastReadAt: null },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.threads(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async getMessages(threadId: string, userId: string, orgId: string, cursor?: string, limit = 50) {
    await this.verifyParticipant(threadId, userId, orgId);

    let query = this.firebase
      .messages(orgId, threadId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (cursor) {
      query = query.where('createdAt', '<', cursor);
    }

    const snap = await query.get();
    let messages = snap.docs
      .filter(d => !d.data().deletedAt)
      .map(d => ({ id: d.id, ...d.data() }));

    const hasMore = messages.length > limit;
    if (hasMore) messages = messages.slice(0, limit);

    // Reverse to return oldest first
    messages.reverse();

    return {
      data: messages,
      meta: {
        hasMore,
        nextCursor: hasMore ? (messages[0] as Record<string, unknown>)?.createdAt : null,
      },
    };
  }

  async sendMessage(
    threadId: string,
    senderId: string,
    orgId: string,
    input: { body?: string; messageType?: string; assetId?: string; replyToId?: string },
  ) {
    await this.verifyParticipant(threadId, senderId, orgId);

    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const data = {
      threadId,
      senderId,
      body: input.body || null,
      messageType: input.messageType ?? 'TEXT',
      assetId: input.assetId || null,
      replyToId: input.replyToId || null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const batch = this.firebase.batch();
    batch.set(this.firebase.messages(orgId, threadId).doc(id), data);
    batch.update(this.firebase.threads(orgId).doc(threadId), { updatedAt: now });
    await batch.commit();

    return { id, ...data };
  }

  async markRead(threadId: string, userId: string, orgId: string) {
    const doc = await this.firebase.threads(orgId).doc(threadId).get();
    if (!doc.exists) throw new NotFoundException('Thread not found');

    const thread = doc.data()!;
    const participants = (thread.participants as Array<Record<string, unknown>>) || [];
    const now = new Date().toISOString();

    const updated = participants.map(p =>
      p.userId === userId ? { ...p, lastReadAt: now } : p,
    );

    await this.firebase.threads(orgId).doc(threadId).update({ participants: updated });
    return { success: true };
  }

  private async verifyParticipant(threadId: string, userId: string, orgId: string) {
    const doc = await this.firebase.threads(orgId).doc(threadId).get();
    if (!doc.exists) throw new NotFoundException('Thread not found');

    const thread = doc.data()!;
    const ids = (thread.participantIds as string[]) || [];
    if (!ids.includes(userId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }
  }
}
