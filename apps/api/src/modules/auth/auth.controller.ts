import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  syncUserSchema,
  registerSchema,
  acceptInviteSchema,
  inviteCoachSchema,
  type SyncUserInput,
  type RegisterInput,
  type AcceptInviteInput,
  type InviteCoachInput,
} from '@coaching/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Called after any Firebase sign-in (email/password, Google, Apple).
   * Returns existing Firestore profile or { isNewUser: true }.
   */
  @Public()
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(syncUserSchema))
  async sync(@Body() body: SyncUserInput) {
    return this.authService.syncUser(body.firebaseUid, body.email);
  }

  /**
   * Called after Firebase createUser â€” creates org + Firestore user profile.
   */
  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  /**
   * Accept a client or coach invite.
   * Firebase Auth account is created client-side first.
   */
  @Public()
  @Post('accept-invite')
  @UsePipes(new ZodValidationPipe(acceptInviteSchema))
  async acceptInvite(@Body() body: AcceptInviteInput) {
    return this.authService.acceptInvite(
      body.token,
      body.firebaseUid,
      body.email,
      body.firstName,
      body.lastName,
    );
  }

  /**
   * Invite a coach (admin only).
   */
  @Post('invite-coach')
  @Roles('ADMIN_COACH')
  @HttpCode(HttpStatus.OK)
  async inviteCoach(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(inviteCoachSchema)) body: InviteCoachInput,
  ) {
    return this.authService.createCoachInvite(
      user.sub,
      user.orgId,
      body.email,
      body.firstName,
      body.lastName,
      body.role,
    );
  }
}
