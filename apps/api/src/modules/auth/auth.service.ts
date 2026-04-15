import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';
import type { RegisterInput, LoginInput } from '@coaching/shared';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_DAYS: number;

  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.REFRESH_TOKEN_DAYS = parseInt(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') || '30',
      10,
    );
  }

  async register(input: RegisterInput) {
    // Check if user already exists
    const existingSnap = await this.firebase.users()
      .where('email', '==', input.email.toLowerCase())
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, this.BCRYPT_ROUNDS);
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

    // Create user with embedded profiles and org membership
    batch.set(this.firebase.users().doc(userId), {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: null,
      avatarUrl: null,
      status: 'ACTIVE',
      lastLoginAt: null,
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

    return this.issueTokens(userId, input.email.toLowerCase(), orgId, 'OWNER', coachProfileId);
  }

  async login(input: LoginInput) {
    const snap = await this.firebase.users()
      .where('email', '==', input.email.toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userDoc = snap.docs[0];
    const user = userDoc.data();

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is suspended or inactive');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userOrg = user.orgs?.[0];
    if (!userOrg) {
      throw new UnauthorizedException('No organization found');
    }

    // Update last login
    await userDoc.ref.update({ lastLoginAt: new Date().toISOString() });

    // Audit log
    await this.firebase.auditLogs(userOrg.orgId).add({
      actorId: userDoc.id,
      action: 'auth.login',
      targetType: 'User',
      targetId: userDoc.id,
      createdAt: new Date().toISOString(),
    });

    return this.issueTokens(
      userDoc.id,
      user.email,
      userOrg.orgId,
      userOrg.role,
      user.coachProfile?.id,
      user.clientProfile?.id,
    );
  }

  async refresh(refreshToken: string) {
    const hashedToken = this.hashToken(refreshToken);

    // Search all users' sessions for this token
    const usersSnap = await this.firebase.users().get();
    let sessionDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let userDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    for (const uDoc of usersSnap.docs) {
      const sessSnap = await this.firebase.sessions(uDoc.id)
        .where('refreshToken', '==', hashedToken)
        .limit(1)
        .get();
      if (!sessSnap.empty) {
        sessionDoc = sessSnap.docs[0];
        userDoc = uDoc;
        break;
      }
    }

    if (!sessionDoc || !userDoc) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = sessionDoc.data();
    if (new Date(session.expiresAt) < new Date()) {
      await sessionDoc.ref.delete();
      throw new UnauthorizedException('Expired refresh token');
    }

    // Rotate: delete old session
    await sessionDoc.ref.delete();

    const user = userDoc.data()!;
    const userOrg = user.orgs?.[0];
    if (!userOrg) {
      throw new UnauthorizedException('No organization found');
    }

    return this.issueTokens(
      userDoc.id,
      user.email,
      userOrg.orgId,
      userOrg.role,
      user.coachProfile?.id,
      user.clientProfile?.id,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hashedToken = this.hashToken(refreshToken);
      const sessSnap = await this.firebase.sessions(userId)
        .where('refreshToken', '==', hashedToken)
        .get();
      const batch = this.firebase.batch();
      sessSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } else {
      const sessSnap = await this.firebase.sessions(userId).get();
      const batch = this.firebase.batch();
      sessSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  async forgotPassword(email: string) {
    const snap = await this.firebase.users()
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) return;

    const userDoc = snap.docs[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(resetToken);

    await this.firebase.sessions(userDoc.id).add({
      refreshToken: hashedToken,
      deviceName: 'password-reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = this.hashToken(token);

    // Search sessions for reset token
    const usersSnap = await this.firebase.users().get();
    let sessionDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let userId: string | null = null;

    for (const uDoc of usersSnap.docs) {
      const sessSnap = await this.firebase.sessions(uDoc.id)
        .where('refreshToken', '==', hashedToken)
        .where('deviceName', '==', 'password-reset')
        .limit(1)
        .get();
      if (!sessSnap.empty) {
        sessionDoc = sessSnap.docs[0];
        userId = uDoc.id;
        break;
      }
    }

    if (!sessionDoc || !userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const session = sessionDoc.data();
    if (new Date(session.expiresAt) < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password and delete all sessions
    await this.firebase.users().doc(userId).update({ passwordHash });
    const allSessions = await this.firebase.sessions(userId).get();
    const batch = this.firebase.batch();
    allSessions.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  async createClientInvite(coachProfileId: string, orgId: string, email: string) {
    const payload = {
      type: 'client-invite',
      email: email.toLowerCase(),
      orgId,
      coachProfileId,
    };

    const token = this.jwt.sign(payload, { expiresIn: '7d' });
    return { inviteToken: token, inviteUrl: `${this.config.get('WEB_URL')}/accept-invite?token=${token}` };
  }

  async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
    let payload: { type: string; email: string; orgId: string; coachProfileId: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Invalid or expired invite token');
    }

    if (payload.type !== 'client-invite') {
      throw new BadRequestException('Invalid token type');
    }

    const existingSnap = await this.firebase.users()
      .where('email', '==', payload.email)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
    const userId = this.firebase.generateId();
    const clientProfileId = this.firebase.generateId();
    const now = new Date().toISOString();

    const batch = this.firebase.batch();

    batch.set(this.firebase.users().doc(userId), {
      email: payload.email,
      passwordHash,
      firstName,
      lastName,
      phone: null,
      avatarUrl: null,
      status: 'ACTIVE',
      lastLoginAt: null,
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

    batch.set(this.firebase.auditLogs(payload.orgId).doc(), {
      actorId: userId,
      action: 'auth.accept_invite',
      targetType: 'ClientProfile',
      targetId: clientProfileId,
      createdAt: now,
    });

    await batch.commit();

    return this.issueTokens(userId, payload.email, payload.orgId, 'CLIENT', undefined, clientProfileId);
  }

  // ────── Private helpers ──────

  private async issueTokens(
    userId: string,
    email: string,
    orgId: string,
    role: string,
    coachProfileId?: string,
    clientProfileId?: string,
  ) {
    const payload = {
      sub: userId,
      email,
      orgId,
      role,
      ...(coachProfileId && { coachProfileId }),
      ...(clientProfileId && { clientProfileId }),
    };

    const accessToken = this.jwt.sign(payload);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefresh = this.hashToken(refreshToken);

    await this.firebase.sessions(userId).add({
      refreshToken: hashedRefresh,
      deviceName: null,
      ipAddress: null,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, orgId, role },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }
}
