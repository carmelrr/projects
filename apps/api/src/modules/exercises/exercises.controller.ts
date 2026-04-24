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
import { ExercisesService } from './exercises.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('exercises')
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.exercisesService.listExercises(user.orgId, query);
  }

  @Get('categories')
  async listCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.exercisesService.listCategories(user.orgId);
  }

  @Post('categories')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string },
  ) {
    const name = await this.exercisesService.createCategory(user.orgId, body.name);
    return { name };
  }

  @Get('muscle-groups')
  async listMuscleGroups(@CurrentUser() user: CurrentUserPayload) {
    return this.exercisesService.listMuscleGroups(user.orgId);
  }

  @Post('muscle-groups')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async createMuscleGroup(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string },
  ) {
    const name = await this.exercisesService.createMuscleGroup(user.orgId, body.name);
    return { name };
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.exercisesService.getExercise(id, user.orgId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string; description?: string; category: string; equipment?: string[]; muscleGroups?: string[]; tags?: string[]; isPrBased?: boolean; difficulty?: string; instructions?: string; videoUrl?: string },
  ) {
    return this.exercisesService.createExercise(user.orgId, user.sub, body);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN_COACH', 'COACH')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; description?: string; category?: string; equipment?: string[]; muscleGroups?: string[]; tags?: string[]; isPrBased?: boolean; difficulty?: string; instructions?: string; videoUrl?: string },
  ) {
    return this.exercisesService.updateExercise(id, user.orgId, body);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN_COACH')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.exercisesService.deleteExercise(id, user.orgId);
    return { success: true };
  }
}
