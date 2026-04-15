import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  // --- Metric Definitions ---

  @Get('definitions')
  async listDefinitions(@CurrentUser() user: CurrentUserPayload) {
    return this.metricsService.listDefinitions(user.orgId);
  }

  @Post('definitions')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async createDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string; unit: string; targetType?: string; frequency?: string },
  ) {
    return this.metricsService.createDefinition(user.orgId, body);
  }

  @Patch('definitions/:id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async updateDefinition(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; unit?: string; targetType?: string; frequency?: string },
  ) {
    return this.metricsService.updateDefinition(id, user.orgId, body);
  }

  // --- Metric Entries ---

  @Post('clients/:clientId')
  async logMetric(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { metricId: string; value: number; notes?: string; source?: string; capturedAt?: string },
  ) {
    return this.metricsService.logMetric(clientId, user.orgId, body);
  }

  @Get('clients/:clientId/:metricId/history')
  async getHistory(
    @Param('clientId') clientId: string,
    @Param('metricId') metricId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.metricsService.getHistory(clientId, user.orgId, metricId, query);
  }

  @Get('clients/:clientId/latest')
  async getLatest(
    @Param('clientId') clientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.metricsService.getLatestMetrics(clientId, user.orgId);
  }
}
