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
import { WorkoutsService } from './workouts.service';
import { WorkoutInstancesService } from './workout-instances.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('workouts')
export class WorkoutsController {
  constructor(
    private workoutsService: WorkoutsService,
    private instancesService: WorkoutInstancesService,
  ) {}

  // --- Workout Templates ---

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.workoutsService.listWorkouts(user.orgId, query);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workoutsService.getWorkout(id, user.orgId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string;
      description?: string;
      type?: string;
      estimatedDuration?: number;
      instructions?: string;
      tags?: string[];
      items?: { exerciseId: string; orderIndex: number; groupLabel?: string; prescription: Record<string, unknown>; coachNotes?: string }[];
    },
  ) {
    return this.workoutsService.createWorkout(user.orgId, user.sub, body);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title?: string; description?: string; type?: string; estimatedDuration?: number; instructions?: string; tags?: string[] },
  ) {
    return this.workoutsService.updateWorkout(id, user.orgId, body);
  }

  @Patch(':id/items')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async updateItems(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { items: { exerciseId: string; orderIndex: number; groupLabel?: string; prescription: Record<string, unknown>; coachNotes?: string }[] },
  ) {
    return this.workoutsService.updateWorkoutItems(id, user.orgId, body.items);
  }

  @Post(':id/duplicate')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workoutsService.duplicateWorkout(id, user.orgId, user.sub);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.workoutsService.deleteWorkout(id, user.orgId);
    return { success: true };
  }

  // --- Workout Instances (scheduling/calendar) ---

  @Get('calendar/:clientId')
  async getCalendar(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.instancesService.getClientCalendar(clientId, user.orgId, startDate, endDate);
  }

  @Get('instances/:id')
  async getInstance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.instancesService.getInstance(id, user.orgId);
  }

  @Post('schedule')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async schedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { clientId: string; templateId: string; scheduledDate: string; title?: string; notes?: string },
  ) {
    return this.instancesService.scheduleWorkout(user.orgId, body);
  }

  @Patch('instances/:id/move')
  async moveInstance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { scheduledDate: string },
  ) {
    return this.instancesService.moveInstance(id, user.orgId, body.scheduledDate);
  }

  @Patch('instances/:id/skip')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async skipInstance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.instancesService.skipInstance(id, user.orgId);
  }

  @Delete('instances/:id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async deleteInstance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.instancesService.deleteInstance(id, user.orgId);
    return { success: true };
  }

  @Post('instances/:id/log')
  async submitLog(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      durationMinutes?: number;
      overallRpe?: number;
      notes?: string;
      items?: Array<{
        exerciseId: string;
        sets: Array<{
          setIndex: number;
          reps?: number;
          weight?: number;
          duration?: number;
          rpe?: number;
          completed: boolean;
        }>;
      }>;
    },
  ) {
    return this.instancesService.submitLog(id, user.orgId, user.sub, body);
  }
}
