import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('clients')
export class ClientsController {
  constructor(
    private clientsService: ClientsService,
    private authService: AuthService,
  ) {}

  @Get()
  @Roles('COACH')
  async listClients(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    // OWNER and ADMIN_COACH see all clients; COACH sees only assigned
    const coachScope = ['OWNER', 'ADMIN_COACH'].includes(user.role) ? undefined : user.coachProfileId;
    return this.clientsService.listClients(user.orgId, query, coachScope);
  }

  @Get(':id')
  @Roles('COACH')
  async getClient(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.getClient(id, user.orgId);
  }

  @Post('invite')
  @Roles('COACH')
  async inviteClient(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { email: string },
  ) {
    if (!user.coachProfileId) {
      throw new Error('Coach profile required to invite clients');
    }
    return this.authService.createClientInvite(user.coachProfileId, user.orgId, body.email);
  }

  @Patch(':id')
  @Roles('COACH')
  async updateClient(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { status?: string; goals?: string; dob?: string; heightCm?: number; medicalNotes?: string },
  ) {
    return this.clientsService.updateClient(id, user.orgId, body);
  }

  @Delete(':id')
  @Roles('ADMIN_COACH')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.clientsService.deleteClient(id, user.orgId);
  }

  // ── Coach assignments ───────────────────────────────

  @Get(':id/assignments')
  @Roles('COACH')
  async listAssignments(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.listAssignments(id, user.orgId);
  }

  @Get(':id/program-assignments')
  @Roles('COACH')
  async listProgramAssignments(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.listProgramAssignments(id, user.orgId);
  }

  @Post(':id/assignments')
  @Roles('ADMIN_COACH')
  async addAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { coachId: string; notes?: string },
  ) {
    return this.clientsService.addAssignment(id, user.orgId, user.sub, body);
  }

  @Delete(':id/assignments/:assignmentId')
  @Roles('ADMIN_COACH')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.clientsService.endAssignment(id, user.orgId, assignmentId, user.sub);
  }
}
