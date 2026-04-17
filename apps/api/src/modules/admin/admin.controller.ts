import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@Roles('ADMIN_COACH')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats')
  async stats(@CurrentUser() user: CurrentUserPayload) {
    return this.admin.getStats(user.orgId);
  }

  @Get('users')
  async listUsers(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { page?: string; limit?: string; role?: string; status?: string; search?: string },
  ) {
    return this.admin.listUsers(user.orgId, query);
  }

  @Patch('users/:id/status')
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
  ) {
    return this.admin.updateUserStatus(user.orgId, id, body.status, user.sub, user.role);
  }

  @Patch('users/:id/role')
  @Roles('OWNER')
  async updateRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { role: 'ADMIN_COACH' | 'COACH' | 'CLIENT' },
  ) {
    return this.admin.updateUserRole(user.orgId, id, body.role, user.sub, user.role);
  }

  @Get('audit-logs')
  async auditLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query()
    query: {
      page?: string;
      limit?: string;
      action?: string;
      actorUserId?: string;
      from?: string;
      to?: string;
    },
  ) {
    return this.admin.listAuditLogs(user.orgId, query);
  }

  @Get('system/health')
  async systemHealth() {
    return this.admin.getSystemHealth();
  }
}
