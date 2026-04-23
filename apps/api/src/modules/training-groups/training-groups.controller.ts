import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TrainingGroupsService } from './training-groups.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  addTrainingGroupMembersSchema,
  assignTrainingGroupProgramSchema,
  createTrainingGroupSchema,
  type AddTrainingGroupMembersInput,
  type AssignTrainingGroupProgramInput,
  type CreateTrainingGroupInput,
  type UpdateTrainingGroupInput,
  updateTrainingGroupSchema,
} from '@coaching/shared';

@Controller('training-groups')
@Roles('OWNER', 'ADMIN_COACH', 'COACH')
export class TrainingGroupsController {
  constructor(private readonly trainingGroups: TrainingGroupsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.trainingGroups.listGroups(user.orgId, query, user.role, user.coachProfileId);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.trainingGroups.getGroup(id, user.orgId, user.role, user.coachProfileId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN_COACH')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createTrainingGroupSchema)) body: CreateTrainingGroupInput,
  ) {
    return this.trainingGroups.createGroup(user.orgId, user.sub, body);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateTrainingGroupSchema)) body: UpdateTrainingGroupInput,
  ) {
    return this.trainingGroups.updateGroup(id, user.orgId, user.sub, body);
  }

  @Post(':id/members')
  @Roles('OWNER', 'ADMIN_COACH')
  async addMembers(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(addTrainingGroupMembersSchema)) body: AddTrainingGroupMembersInput,
  ) {
    return this.trainingGroups.addMembers(id, user.orgId, user.sub, body.clientUserIds);
  }

  @Delete(':id/members/:clientUserId')
  @Roles('OWNER', 'ADMIN_COACH')
  async removeMember(
    @Param('id') id: string,
    @Param('clientUserId') clientUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.trainingGroups.removeMember(id, user.orgId, user.sub, clientUserId);
  }

  @Post(':id/assign-program')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async assignProgram(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(assignTrainingGroupProgramSchema)) body: AssignTrainingGroupProgramInput,
  ) {
    return this.trainingGroups.assignProgram(id, user.orgId, user.sub, user.role, user.coachProfileId, body);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.trainingGroups.deleteGroup(id, user.orgId);
  }
}