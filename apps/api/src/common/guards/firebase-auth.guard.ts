import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FirebaseService } from '../../modules/firebase/firebase.service';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const idToken = authHeader.slice(7);

    try {
      const decoded = await this.firebase.auth.verifyIdToken(idToken);

      // Look up the Firestore user profile by firebaseUid
      const usersSnap = await this.firebase
        .users()
        .where('firebaseUid', '==', decoded.uid)
        .limit(1)
        .get();

      if (usersSnap.empty) {
        throw new UnauthorizedException('User profile not found');
      }

      const userDoc = usersSnap.docs[0];
      const user = userDoc.data();
      const userOrg = user.orgs?.[0];

      const payload: CurrentUserPayload = {
        sub: userDoc.id,
        email: decoded.email ?? user.email,
        orgId: userOrg?.orgId ?? '',
        role: userOrg?.role ?? 'COACH',
        coachProfileId: user.coachProfile?.id,
        clientProfileId: user.clientProfile?.id,
      };

      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
