import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
      weightUnit?: 'kg' | 'lbs';
    },
  ) {
    return this.usersService.updateMe(user.sub, body);
  }

  @Get('me/notification-prefs')
  async getNotificationPrefs(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getNotificationPrefs(user.sub);
  }

  @Patch('me/notification-prefs')
  async updateNotificationPrefs(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, boolean>,
  ) {
    return this.usersService.updateNotificationPrefs(user.sub, body);
  }

  @Patch('me/password')
  async updatePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { newPassword: string },
  ) {
    return this.usersService.updatePassword(user.sub, body.newPassword);
  }

  @Post('me/push-tokens')
  async registerPushToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { token: string; platform?: string },
  ) {
    return this.usersService.registerPushToken(user.sub, body.token, body.platform);
  }

  @Delete('me/push-tokens/:token')
  async unregisterPushToken(
    @CurrentUser() user: CurrentUserPayload,
    @Param('token') token: string,
  ) {
    return this.usersService.unregisterPushToken(user.sub, token);
  }

  @Delete('me')
  async deleteMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.deleteMe(user.sub);
  }
}
