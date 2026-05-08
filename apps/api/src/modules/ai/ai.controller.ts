import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AICacheService } from './ai-cache.service';
import { AIExerciseService, ExerciseAutofillInput } from './ai-exercise.service';
import {
  AIPrescriptionService,
  PrescriptionInput,
} from './ai-prescription.service';
import { AIRecommendService, SuggestExercisesInput } from './ai-recommend.service';

@Controller('ai')
@Roles('OWNER', 'ADMIN_COACH', 'COACH')
export class AIController {
  constructor(
    private autofill: AIExerciseService,
    private recommend: AIRecommendService,
    private prescription: AIPrescriptionService,
    private cache: AICacheService,
  ) {}

  @Post('exercises/autofill')
  async exerciseAutofill(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: ExerciseAutofillInput,
  ) {
    if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
    }
    await this.assertRateLimit(user.sub);
    return this.autofill.autofill(user.orgId, user.sub, body);
  }

  @Post('workouts/suggest-exercises')
  async suggestExercises(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: SuggestExercisesInput,
  ) {
    await this.assertRateLimit(user.sub);
    return this.recommend.suggestExercises(user.orgId, user.sub, body || {});
  }

  @Post('prescription/suggest')
  async suggestPrescription(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: PrescriptionInput,
  ) {
    if (!body?.exerciseId || !body?.clientId) {
      throw new HttpException('exerciseId and clientId are required', HttpStatus.BAD_REQUEST);
    }
    await this.assertRateLimit(user.sub);
    return this.prescription.suggest(user.orgId, user.sub, body);
  }

  @Patch('suggestions/:id/adopted')
  async markAdopted(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    await this.cache.markAdopted(user.orgId, id);
    return { ok: true };
  }

  private async assertRateLimit(coachId: string) {
    const check = await this.cache.checkRateLimit(coachId);
    if (!check.allowed) {
      throw new HttpException(
        check.reason === 'minute'
          ? 'Too many AI requests this minute'
          : 'Daily AI request limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
