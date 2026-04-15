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
import { ProgramsService } from './programs.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('programs')
export class ProgramsController {
  constructor(private programsService: ProgramsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.programsService.listPrograms(user.orgId, query);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.programsService.getProgram(id, user.orgId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title: string; description?: string; isPrivate?: boolean; tags?: string[]; weeks?: { title?: string; notes?: string; workoutIds?: string[] }[] },
  ) {
    return this.programsService.createProgram(user.orgId, user.sub, body);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title?: string; description?: string; isPrivate?: boolean; tags?: string[] },
  ) {
    return this.programsService.updateProgram(id, user.orgId, body);
  }

  @Post(':id/weeks')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async addWeek(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title?: string; notes?: string },
  ) {
    return this.programsService.addWeek(id, user.orgId, body);
  }

  @Post(':id/assign')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async assign(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { clientId: string; startDate: string },
  ) {
    return this.programsService.assignProgram(id, user.orgId, user.sub, body);
  }

  @Post(':id/duplicate')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.programsService.duplicateProgram(id, user.orgId, user.sub);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.programsService.deleteProgram(id, user.orgId);
    return { success: true };
  }
}
