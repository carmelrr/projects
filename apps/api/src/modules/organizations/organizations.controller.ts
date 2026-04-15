import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get(':id')
  async getOrg(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Record<string, unknown>> {
    // Ensure user can only access their own org
    if (id !== user.orgId) {
      return this.orgsService.getOrg(user.orgId);
    }
    return this.orgsService.getOrg(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  async updateOrg(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; timezone?: string; logoUrl?: string },
  ): Promise<Record<string, unknown>> {
    return this.orgsService.updateOrg(user.orgId, body);
  }
}
