import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class MessagingService {
  constructor(private firebase: FirebaseService) {}

  async listThreads(userId: string, orgId: string) {
    // Query threads where this user is a participant.
    // NOTE: we deliberately don't use .orderBy('updatedAt', 'desc') here
    // because combining array-contains with orderBy requires a composite
    // index. We sort in-memory instead — number of threads per user is
    // always small.
    const snap = await this.firebase
      .threads(orgId)
      .where('participantIds', 'array-contains', userId)
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

      const lastMessage: Record<string, unknown> | null = msgSnap.empty
        ? null
        : { id: msgSnap.docs[0].id, ...msgSnap.docs[0].data() };

      // Calculate unread count
      const participantEntries = (thread.participants as Array<Record<string, unknown>>) || [];
      const myEntry = participantEntries.find((p: Record<string, unknown>) => p.userId === userId);
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

      const participantIds = participantEntries
        .map((p) => p.userId)
        .filter((id): id is string => typeof id === 'string');
      const usersById = await this.getUsersById(participantIds);
      const participants = participantEntries.map((p) => {
        const participantUserId = p.userId as string | undefined;
        return {
          ...p,
          unreadCount: participantUserId === userId ? unreadCount : 0,
          user: participantUserId ? usersById.get(participantUserId) : undefined,
        };
      });

      const lastMessageBody = lastMessage?.['body'];

      threads.push({
        id: doc.id,
        ...thread,
        participants,
        lastMessage,
        lastMessageAt: (lastMessage?.['createdAt'] as string | undefined) ?? thread.updatedAt,
        lastMessagePreview:
          typeof lastMessageBody === 'string' && lastMessageBody.length > 0
            ? lastMessageBody
            : lastMessage
              ? '[attachment]'
              : undefined,
        unreadCount,
      });
    }

    // Sort by updatedAt desc in-memory (see note above about composite indexes)
    threads.sort((a, b) => {
      const au = (a.updatedAt as string | undefined) || '';
      const bu = (b.updatedAt as string | undefined) || '';
      return bu.localeCompare(au);
    });

    return threads;
  }

  async getOrCreateDirectThread(orgId: string, userId: string, otherUserId: string) {
    const normalizedOtherUserId = await this.resolveParticipantUserId(orgId, otherUserId);
    if (!normalizedOtherUserId) throw new NotFoundException('User not found');

    // Find existing direct thread between these two users
    const snap = await this.firebase
      .threads(orgId)
      .where('type', '==', 'DIRECT')
      .where('participantIds', 'array-contains', userId)
      .get();

    const existingThread = snap.docs.find(doc => {
      const data = doc.data();
      const ids = (data.participantIds as string[]) || [];
      return ids.includes(normalizedOtherUserId) || ids.includes(otherUserId);
    });

    if (existingThread) {
      const existingData = existingThread.data();
      if (otherUserId !== normalizedOtherUserId) {
        const participantIds = ((existingData.participantIds as string[]) || []).map((id) =>
          id === otherUserId ? normalizedOtherUserId : id,
        );
        const repairedParticipantIds = [...new Set(participantIds)];
        const participants = ((existingData.participants as Array<Record<string, unknown>>) || []).map((p) =>
          p.userId === otherUserId ? { ...p, userId: normalizedOtherUserId } : p,
        );

        await this.firebase.threads(orgId).doc(existingThread.id).update({
          participantIds: repairedParticipantIds,
          participants,
        });

        return {
          id: existingThread.id,
          ...existingData,
          participantIds: repairedParticipantIds,
          participants,
        };
      }

      return { id: existingThread.id, ...existingData };
    }

    // Create new direct thread
    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const data = {
      orgId,
      type: 'DIRECT',
      createdBy: userId,
      participantIds: [userId, normalizedOtherUserId],
      participants: [
        { userId, role: 'member', lastReadAt: null },
        { userId: normalizedOtherUserId, role: 'member', lastReadAt: null },
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

    const usersById = await this.getUsersById(
      messages
        .map((m) => (m as Record<string, unknown>).senderId)
        .filter((id): id is string => typeof id === 'string'),
    );
    const items = messages.map((m) => {
      const senderId = (m as Record<string, unknown>).senderId as string | undefined;
      return {
        ...m,
        sender: senderId ? usersById.get(senderId) : undefined,
      };
    });

    return {
      items,
      nextCursor: hasMore ? ((items[0] as Record<string, unknown>)?.createdAt as string) : undefined,
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

  private async getUsersById(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        const doc = await this.firebase.users().doc(id).get();
        if (!doc.exists) return null;
        const user = doc.data()!;
        return [
          id,
          {
            id,
            firstName: (user.firstName as string) ?? '',
            lastName: (user.lastName as string) ?? '',
            avatarUrl: (user.avatarUrl as string | null) ?? null,
          },
        ] as const;
      }),
    );

    return new Map(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
  }

  private async resolveParticipantUserId(orgId: string, userOrProfileId: string) {
    const directUserDoc = await this.firebase.users().doc(userOrProfileId).get();
    if (directUserDoc.exists && this.userBelongsToOrg(directUserDoc.data(), orgId)) {
      return directUserDoc.id;
    }

    for (const field of ['coachProfile.id', 'clientProfile.id']) {
      const snap = await this.firebase
        .users()
        .where(field, '==', userOrProfileId)
        .limit(1)
        .get();
      const profileUserDoc = snap.docs[0];
      if (profileUserDoc && this.userBelongsToOrg(profileUserDoc.data(), orgId)) {
        return profileUserDoc.id;
      }
    }

    return null;
  }

  private userBelongsToOrg(user: FirebaseFirestore.DocumentData | undefined, orgId: string) {
    return ((user?.orgs as Array<{ orgId: string }> | undefined) ?? []).some(
      (org) => org.orgId === orgId,
    );
  }
}
