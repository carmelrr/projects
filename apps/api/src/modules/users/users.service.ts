import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

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
      orgs: (user.orgs || []).map((o: { orgId: string; role: string }) => ({
        role: o.role,
        orgId: o.orgId,
      })),
      coachProfile: user.coachProfile
        ? { id: user.coachProfile.id, bio: user.coachProfile.bio, specialties: user.coachProfile.specialties }
        : null,
      clientProfile: user.clientProfile
        ? { id: user.clientProfile.id, status: user.clientProfile.status, goals: user.clientProfile.goals }
        : null,
    };
  }

  async updateMe(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
    await this.firebase.users().doc(userId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const doc = await this.firebase.users().doc(userId).get();
    const user = doc.data()!;
    return {
      id: doc.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }
}
