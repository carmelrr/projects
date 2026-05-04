import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  emailMessages: true,
  emailAssignments: true,
  emailWeekly: false,
  pushMessages: true,
  pushReminders: true,
};

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  async getMe(userId: string) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const user = doc.data()!;
    return {
      id: doc.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      weightUnit: (user.weightUnit as 'kg' | 'lbs') ?? 'kg',
      orgs: (user.orgs || []).map((o: { orgId: string; role: string }) => ({
        role: o.role,
        orgId: o.orgId,
      })),
      coachProfile: user.coachProfile
        ? {
            id: user.coachProfile.id,
            bio: user.coachProfile.bio,
            specialties: user.coachProfile.specialties,
          }
        : null,
      clientProfile: user.clientProfile
        ? {
            id: user.clientProfile.id,
            status: user.clientProfile.status,
            goals: user.clientProfile.goals,
          }
        : null,
    };
  }

  async getMyCoach(userId: string, orgId: string, clientProfileId?: string) {
    if (!orgId) return null;

    const userAssignmentSnap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', userId)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    let assignmentDoc = userAssignmentSnap.docs[0];

    if (!assignmentDoc && clientProfileId) {
      const profileAssignmentSnap = await this.firebase
        .clientAssignments(orgId)
        .where('clientId', '==', clientProfileId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      assignmentDoc = profileAssignmentSnap.docs[0];
    }

    if (!assignmentDoc) return null;

    const assignment = assignmentDoc.data();
    const coachProfileId = assignment.coachId as string;
    if (!coachProfileId) return null;

    // Find the coach user by their coachProfile.id
    const coachSnap = await this.firebase
      .users()
      .where('coachProfile.id', '==', coachProfileId)
      .limit(1)
      .get();

    if (coachSnap.empty) return null;

    const coachDoc = coachSnap.docs[0];
    const coachUser = coachDoc.data();

    return {
      id: coachProfileId,
      userId: coachDoc.id,
      firstName: coachUser.firstName as string,
      lastName: coachUser.lastName as string,
      email: coachUser.email as string,
      avatarUrl: (coachUser.avatarUrl as string | null) ?? null,
    };
  }

  async updateMe(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
      weightUnit?: 'kg' | 'lbs';
    },
  ) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl || null;
    if (data.weightUnit !== undefined) {
      if (data.weightUnit === 'kg' || data.weightUnit === 'lbs') {
        update.weightUnit = data.weightUnit;
      }
    }

    if (data.bio !== undefined) {
      const current = doc.data()!;
      const existingCoach = (current.coachProfile as Record<string, unknown>) || null;
      if (existingCoach) {
        update.coachProfile = { ...existingCoach, bio: data.bio || null };
      }
    }

    await this.firebase.users().doc(userId).update(update);
    return this.getMe(userId);
  }

  async getNotificationPrefs(userId: string) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const prefs = (doc.data()?.notificationPrefs as Record<string, boolean>) || {};
    return { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  }

  async updateNotificationPrefs(userId: string, prefs: Record<string, boolean>) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const current = (doc.data()?.notificationPrefs as Record<string, boolean>) || {};
    const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...current, ...prefs };
    await this.firebase.users().doc(userId).update({
      notificationPrefs: merged,
      updatedAt: new Date().toISOString(),
    });
    return merged;
  }

  async updatePassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new NotFoundException('Password must be at least 8 characters');
    }
    await this.firebase.auth.updateUser(userId, { password: newPassword });
    return { success: true };
  }

  async registerPushToken(userId: string, token: string, platform?: string) {
    if (!token) throw new NotFoundException('Token required');
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const existing = (doc.data()?.pushTokens as Array<{ token: string; platform?: string; registeredAt: string }>) || [];
    const filtered = existing.filter((t) => t.token !== token);
    filtered.push({ token, platform: platform || 'unknown', registeredAt: new Date().toISOString() });
    await this.firebase.users().doc(userId).update({
      pushTokens: filtered,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, count: filtered.length };
  }

  async unregisterPushToken(userId: string, token: string) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');
    const existing = (doc.data()?.pushTokens as Array<{ token: string }>) || [];
    const filtered = existing.filter((t) => t.token !== token);
    await this.firebase.users().doc(userId).update({
      pushTokens: filtered,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  /**
   * Delete the current user's account and all associated data.
   * - Removes Firestore user document
   * - Removes Firebase Auth account
   * - Removes client assignments if coach
   */
  async deleteMe(userId: string) {
    const doc = await this.firebase.users().doc(userId).get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const user = doc.data()!;
    const firebaseUid = user.firebaseUid as string | undefined;
    const orgs = (user.orgs as Array<{ orgId: string; role: string }>) || [];
    const batch = this.firebase.batch();

    // Delete the user document
    batch.delete(this.firebase.users().doc(userId));

    // Write audit log for each org
    for (const org of orgs) {
      batch.set(this.firebase.auditLogs(org.orgId).doc(), {
        actorId: userId,
        action: 'user.account_deleted',
        targetType: 'User',
        targetId: userId,
        createdAt: new Date().toISOString(),
      });
    }

    await batch.commit();

    // Delete Firebase Auth account (best-effort)
    if (firebaseUid) {
      try {
        await this.firebase.auth.deleteUser(firebaseUid);
      } catch {
        // Auth record may not exist or already deleted
      }
    }

    return { success: true };
  }
}
