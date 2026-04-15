import { Controller, Get, Patch, Body } from '@nestjs/common';
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
    @Body() body: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateMe(user.sub, body);
  }
}
