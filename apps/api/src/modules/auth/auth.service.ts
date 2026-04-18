import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Called after Firebase client-side auth (register or social login).
   * Creates or retrieves the Firestore user profile.
   */
  async syncUser(firebaseUid: string, email: string) {
    // Check if user already exists by firebaseUid
    const existingSnap = await this.firebase
      .users()
      .where('firebaseUid', '==', firebaseUid)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const userDoc = existingSnap.docs[0];
      const user = userDoc.data();
      const userOrg = user.orgs?.[0];

      // Update last login
      await userDoc.ref.update({ lastLoginAt: new Date().toISOString() });

      return {
        user: {
          id: userDoc.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          orgId: userOrg?.orgId ?? '',
          role: userOrg?.role ?? 'COACH',
          avatarUrl: user.avatarUrl ?? null,
        },
        isNewUser: false,
      };
    }

    // Also check by email (for invited users who haven't linked yet)
    const emailSnap = await this.firebase
      .users()
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!emailSnap.empty) {
      const userDoc = emailSnap.docs[0];
      const user = userDoc.data();
      const userOrg = user.orgs?.[0];

      // Link firebaseUid to existing profile and activate it (was PENDING
      // until the user actually signed in for the first time).
      const updates: Record<string, unknown> = {
        firebaseUid,
        lastLoginAt: new Date().toISOString(),
      };
      if (user.status === 'PENDING') updates.status = 'ACTIVE';
      if (user.clientProfile && user.clientProfile.status === 'PENDING') {
        updates['clientProfile.status'] = 'ACTIVE';
      }
      await userDoc.ref.update(updates);

      return {
        user: {
          id: userDoc.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          orgId: userOrg?.orgId ?? '',
          role: userOrg?.role ?? 'COACH',
          avatarUrl: user.avatarUrl ?? null,
        },
        isNewUser: false,
      };
    }

    // New user â€” no profile yet
    return { user: null, isNewUser: true };
  }

  /**
   * Full registration: creates org + user profile in Firestore.
   * Called after Firebase Auth account is already created client-side.
   */
  async register(input: {
    firebaseUid: string;
    email: string;
    firstName: string;
    lastName: string;
    orgName: string;
  }) {
    // Ensure not already registered
    const existingSnap = await this.firebase
      .users()
      .where('firebaseUid', '==', input.firebaseUid)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new ConflictException('User already registered');
    }

    const slug = this.generateSlug(input.orgName);
    const orgId = this.firebase.generateId();
    const userId = this.firebase.generateId();
    const coachProfileId = this.firebase.generateId();
    const now = new Date().toISOString();

    const batch = this.firebase.batch();

    // Create organization
    batch.set(this.firebase.organizations().doc(orgId), {
      name: input.orgName,
      slug,
      timezone: 'UTC',
      logoUrl: null,
      brandingTheme: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create user profile
    batch.set(this.firebase.users().doc(userId), {
      firebaseUid: input.firebaseUid,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: null,
      avatarUrl: null,
      status: 'ACTIVE',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      orgs: [{ orgId, role: 'OWNER', joinedAt: now }],
      coachProfile: {
        id: coachProfileId,
        orgId,
        bio: null,
        specialties: [],
        capacity: null,
      },
      clientProfile: null,
    });

    // Audit log
    batch.set(this.firebase.auditLogs(orgId).doc(), {
      actorId: userId,
      action: 'auth.register',
      targetType: 'User',
      targetId: userId,
      createdAt: now,
    });

    await batch.commit();

    return {
      user: {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        orgId,
        role: 'OWNER' as const,
        avatarUrl: null,
      },
    };
  }

  // ── Invite flows (still uses JWT for invite tokens) ──────

  /**
   * Coach invites a client: creates a PENDING Firestore user doc + client
   * profile (+ optional coach assignment) so that when the client later signs
   * in with Google/Apple/email/password using the same email address,
   * `syncUser()` auto-links by email and the user immediately has access to
   * their org and assigned coach.
   *
   * If a user already exists with that email (PENDING or ACTIVE), this is a
   * no-op for the user doc — we just re-issue the invite token so the coach
   * can resend the link.
   */
  async createClientInvite(coachProfileId: string, orgId: string, email: string) {
    const lowerEmail = email.toLowerCase();

    const existingSnap = await this.firebase
      .users()
      .where('email', '==', lowerEmail)
      .limit(1)
      .get();

    if (existingSnap.empty) {
      const userId = this.firebase.generateId();
      const clientProfileId = this.firebase.generateId();
      const now = new Date().toISOString();

      const batch = this.firebase.batch();

      batch.set(this.firebase.users().doc(userId), {
        firebaseUid: null,
        email: lowerEmail,
        firstName: '',
        lastName: '',
        phone: null,
        avatarUrl: null,
        status: 'PENDING',
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        orgs: [{ orgId, role: 'CLIENT', joinedAt: now }],
        coachProfile: null,
        clientProfile: {
          id: clientProfileId,
          orgId,
          status: 'PENDING',
          dob: null,
          heightCm: null,
          goals: null,
          medicalNotes: null,
          archivedAt: null,
        },
      });

      batch.set(this.firebase.clientAssignments(orgId).doc(), {
        clientId: clientProfileId,
        clientUserId: userId,
        coachId: coachProfileId,
        status: 'ACTIVE',
        startAt: now,
        endAt: null,
        notes: null,
        createdAt: now,
      });

      batch.set(this.firebase.auditLogs(orgId).doc(), {
        actorId: coachProfileId,
        action: 'auth.invite_client',
        targetType: 'User',
        targetId: lowerEmail,
        createdAt: now,
      });

      await batch.commit();
    }

    const payload = {
      type: 'client-invite',
      email: lowerEmail,
      orgId,
      coachProfileId,
    };

    const token = this.jwt.sign(payload, { expiresIn: '7d' });
    return {
      inviteToken: token,
      inviteUrl: `${this.config.get('WEB_URL')}/accept-invite?token=${token}`,
    };
  }

  async createCoachInvite(
    actorUserId: string,
    orgId: string,
    email: string,
    firstName: string,
    lastName: string,
    role: 'COACH' | 'ADMIN_COACH' = 'COACH',
  ) {
    const existingSnap = await this.firebase
      .users()
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new ConflictException('Email already registered');
    }

    const payload = {
      type: 'coach-invite',
      email: email.toLowerCase(),
      orgId,
      role,
      firstName,
      lastName,
    };

    const token = this.jwt.sign(payload, { expiresIn: '7d' });

    await this.firebase.auditLogs(orgId).add({
      actorId: actorUserId,
      action: 'auth.invite_coach',
      targetType: 'User',
      targetId: email.toLowerCase(),
      metadata: { role, firstName, lastName },
      createdAt: new Date().toISOString(),
    });

    return {
      inviteToken: token,
      inviteUrl: `${this.config.get('WEB_URL') || ''}/accept-invite?token=${token}`,
      email: email.toLowerCase(),
      role,
    };
  }

  /**
   * Accept an invite: creates Firestore profile.
   * Firebase Auth account is already created client-side.
   */
  async acceptInvite(
    inviteToken: string,
    firebaseUid: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    let payload: {
      type: string;
      email: string;
      orgId: string;
      coachProfileId?: string;
      role?: 'COACH' | 'ADMIN_COACH';
      firstName?: string;
      lastName?: string;
    };
    try {
      payload = this.jwt.verify(inviteToken);
    } catch {
      throw new BadRequestException('Invalid or expired invite token');
    }

    if (payload.type === 'coach-invite') {
      return this.acceptCoachInvite(payload, firebaseUid, email, firstName, lastName);
    }

    if (payload.type !== 'client-invite') {
      throw new BadRequestException('Invalid token type');
    }

    return this.acceptClientInvite(payload, firebaseUid, email, firstName, lastName);
  }

  private async acceptClientInvite(
    payload: { email: string; orgId: string; coachProfileId?: string },
    firebaseUid: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    const lowerEmail = email.toLowerCase();
    const now = new Date().toISOString();

    // If a user doc already exists for this email (PENDING from invite, or
    // ACTIVE from a prior social login), upgrade it in-place instead of
    // creating a duplicate.
    const existingSnap = await this.firebase
      .users()
      .where('email', '==', lowerEmail)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const userDoc = existingSnap.docs[0];
      const existing = userDoc.data();
      const existingClientProfileId: string | undefined =
        existing.clientProfile?.id;

      const updates: Record<string, unknown> = {
        firebaseUid,
        firstName: firstName || existing.firstName || '',
        lastName: lastName || existing.lastName || '',
        status: 'ACTIVE',
        lastLoginAt: now,
        updatedAt: now,
      };

      // Ensure org membership exists.
      const orgs: Array<{ orgId: string; role: string; joinedAt: string }> =
        Array.isArray(existing.orgs) ? existing.orgs : [];
      const hasOrg = orgs.some((o) => o.orgId === payload.orgId);
      if (!hasOrg) {
        updates.orgs = [
          ...orgs,
          { orgId: payload.orgId, role: 'CLIENT', joinedAt: now },
        ];
      }

      const clientProfileId = existingClientProfileId ?? this.firebase.generateId();
      if (!existingClientProfileId) {
        updates.clientProfile = {
          id: clientProfileId,
          orgId: payload.orgId,
          status: 'ACTIVE',
          dob: null,
          heightCm: null,
          goals: null,
          medicalNotes: null,
          archivedAt: null,
        };
      } else if (existing.clientProfile?.status !== 'ACTIVE') {
        updates['clientProfile.status'] = 'ACTIVE';
      }

      const batch = this.firebase.batch();
      batch.update(userDoc.ref, updates);

      // Ensure coach assignment exists if invite carried one.
      if (payload.coachProfileId) {
        const assignSnap = await this.firebase
          .clientAssignments(payload.orgId)
          .where('clientId', '==', clientProfileId)
          .where('coachId', '==', payload.coachProfileId)
          .where('status', '==', 'ACTIVE')
          .limit(1)
          .get();

        if (assignSnap.empty) {
          batch.set(this.firebase.clientAssignments(payload.orgId).doc(), {
            clientId: clientProfileId,
            clientUserId: userDoc.id,
            coachId: payload.coachProfileId,
            status: 'ACTIVE',
            startAt: now,
            endAt: null,
            notes: null,
            createdAt: now,
          });
        }
      }

      batch.set(this.firebase.auditLogs(payload.orgId).doc(), {
        actorId: userDoc.id,
        action: 'auth.accept_invite',
        targetType: 'ClientProfile',
        targetId: clientProfileId,
        createdAt: now,
      });

      await batch.commit();

      return {
        user: {
          id: userDoc.id,
          email: lowerEmail,
          firstName: (updates.firstName as string) ?? '',
          lastName: (updates.lastName as string) ?? '',
          orgId: payload.orgId,
          role: 'CLIENT' as const,
          avatarUrl: existing.avatarUrl ?? null,
        },
      };
    }

    // No existing user — create from scratch (legacy path, e.g. invite link
    // opened on a device without prior sign-in).
    const userId = this.firebase.generateId();
    const clientProfileId = this.firebase.generateId();

    const batch = this.firebase.batch();

    batch.set(this.firebase.users().doc(userId), {
      firebaseUid,
      email: lowerEmail,
      firstName,
      lastName,
      phone: null,
      avatarUrl: null,
      status: 'ACTIVE',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      orgs: [{ orgId: payload.orgId, role: 'CLIENT', joinedAt: now }],
      coachProfile: null,
      clientProfile: {
        id: clientProfileId,
        orgId: payload.orgId,
        status: 'ACTIVE',
        dob: null,
        heightCm: null,
        goals: null,
        medicalNotes: null,
        archivedAt: null,
      },
    });

    if (payload.coachProfileId) {
      batch.set(this.firebase.clientAssignments(payload.orgId).doc(), {
        clientId: clientProfileId,
        clientUserId: userId,
        coachId: payload.coachProfileId,
        status: 'ACTIVE',
        startAt: now,
        endAt: null,
        notes: null,
        createdAt: now,
      });
    }

    batch.set(this.firebase.auditLogs(payload.orgId).doc(), {
      actorId: userId,
      action: 'auth.accept_invite',
      targetType: 'ClientProfile',
      targetId: clientProfileId,
      createdAt: now,
    });

    await batch.commit();

    return {
      user: {
        id: userId,
        email: lowerEmail,
        firstName,
        lastName,
        orgId: payload.orgId,
        role: 'CLIENT' as const,
        avatarUrl: null,
      },
    };
  }

  private async acceptCoachInvite(
    payload: { email: string; orgId: string; role?: 'COACH' | 'ADMIN_COACH' },
    firebaseUid: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    const role = payload.role ?? 'COACH';
    const userId = this.firebase.generateId();
    const coachProfileId = this.firebase.generateId();
    const now = new Date().toISOString();

    const batch = this.firebase.batch();

    batch.set(this.firebase.users().doc(userId), {
      firebaseUid,
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: null,
      avatarUrl: null,
      status: 'ACTIVE',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      orgs: [{ orgId: payload.orgId, role, joinedAt: now }],
      coachProfile: {
        id: coachProfileId,
        orgId: payload.orgId,
        bio: null,
        specialties: [],
        capacity: null,
      },
      clientProfile: null,
    });

    batch.set(this.firebase.auditLogs(payload.orgId).doc(), {
      actorId: userId,
      action: 'auth.accept_coach_invite',
      targetType: 'User',
      targetId: userId,
      createdAt: now,
    });

    await batch.commit();

    return {
      user: {
        id: userId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        orgId: payload.orgId,
        role,
        avatarUrl: null,
      },
    };
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }
}
