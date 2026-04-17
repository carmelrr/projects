import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Throttle } from '@nestjs/throttler';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
  inviteCoachSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshTokenInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type AcceptInviteInput,
  type InviteCoachInput,
} from '@coaching/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 per 15 min
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginInput) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  async refresh(@Body() body: RefreshTokenInput) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body('refreshToken') refreshToken?: string,
  ) {
    await this.authService.logout(user.sub, refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() body: ForgotPasswordInput) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: ResetPasswordInput) {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password has been reset' };
  }

  @Public()
  @Post('accept-invite')
  @UsePipes(new ZodValidationPipe(acceptInviteSchema))
  async acceptInvite(@Body() body: AcceptInviteInput) {
    return this.authService.acceptInvite(
      body.token,
      body.password,
      body.firstName,
      body.lastName,
    );
  }

  @Post('invite-coach')
  @Roles('ADMIN_COACH')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(inviteCoachSchema))
  async inviteCoach(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: InviteCoachInput,
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
