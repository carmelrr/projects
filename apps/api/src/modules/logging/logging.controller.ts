import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { ComplianceService } from './compliance.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('logging')
export class LoggingController {
  constructor(
    private loggingService: LoggingService,
    private complianceService: ComplianceService,
  ) {}

  @Post('workout-logs')
  async submitLog(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      workoutInstanceId: string;
      startedAt: string;
      finishedAt?: string;
      perceivedExertion?: number;
      clientNotes?: string;
      sets: { itemId: string; setNumber: number; reps?: number; weight?: number; time?: number; distance?: number; calories?: number; rpe?: number; notes?: string }[];
    },
  ) {
    if (!user.clientProfileId) {
      throw new Error('Only clients can submit workout logs');
    }
    return this.loggingService.submitLog(user.clientProfileId, user.orgId, body);
  }

  @Get('workout-logs/:id')
  async getLog(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loggingService.getLog(id, user.orgId);
  }

  @Get('clients/:clientId/logs')
  async listClientLogs(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.loggingService.listClientLogs(clientId, user.orgId, query);
  }

  @Post('workout-logs/:id/feedback')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async addFeedback(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { feedback: string },
  ) {
    return this.loggingService.addFeedback(id, user.orgId, body.feedback);
  }

  @Get('clients/:clientId/exercises/:exerciseId/history')
  async getExerciseHistory(
    @Param('clientId') clientId: string,
    @Param('exerciseId') exerciseId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.loggingService.getExerciseHistory(clientId, user.orgId, exerciseId, limit ? parseInt(limit, 10) : 10);
  }

  @Get('clients/:clientId/compliance')
  async getCompliance(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.complianceService.getClientCompliance(clientId, user.orgId, limit ? parseInt(limit, 10) : 12);
  }
}
