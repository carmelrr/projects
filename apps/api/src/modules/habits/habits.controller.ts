import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('habits')
export class HabitsController {
  constructor(private habits: HabitsService) {}

  // ── Definitions ──────────────────────────────────────────────────────────

  @Get('definitions')
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('clientId') clientId?: string,
  ) {
    // Clients see only their own habits (org-wide + assigned to them)
    const filterClient = user.role === 'CLIENT' ? user.sub : clientId;
    return this.habits.listDefinitions(user.orgId, filterClient);
  }

  @Post('definitions')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      frequency?: 'DAILY' | 'WEEKLY';
      target?: number;
      unit?: string;
      clientId?: string;
    },
  ) {
    return this.habits.createDefinition(user.orgId, user.sub, body);
  }

  @Patch('definitions/:id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Partial<{
      name: string;
      description: string;
      frequency: 'DAILY' | 'WEEKLY';
      target: number;
      unit: string;
      clientId: string;
      archived: boolean;
    }>,
  ) {
    return this.habits.updateDefinition(id, user.orgId, body);
  }

  @Delete('definitions/:id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.habits.deleteDefinition(id, user.orgId);
  }

  // ── Logs ─────────────────────────────────────────────────────────────────

  @Post('clients/:clientId/log')
  async log(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      habitId: string;
      date: string;
      value?: number;
      completed?: boolean;
      notes?: string;
    },
  ) {
    await this.habits.assertClientMatchesOrg(clientId, user.orgId);
    return this.habits.logHabit(clientId, user.orgId, body);
  }

  @Get('clients/:clientId/logs')
  async getLogs(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.habits.assertClientMatchesOrg(clientId, user.orgId);
    return this.habits.getLogs(clientId, user.orgId, { date, from, to });
  }
}
