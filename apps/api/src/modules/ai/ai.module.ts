import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { RedisModule } from '../redis/redis.module';
import { AICacheService } from './ai-cache.service';
import { AIController } from './ai.controller';
import { AIExerciseService } from './ai-exercise.service';
import { AIPrescriptionService } from './ai-prescription.service';
import { AIRecommendService } from './ai-recommend.service';
import { GeminiProvider } from './providers/gemini.provider';
import { AI_PROVIDER } from './providers/ai-provider.interface';

@Module({
  imports: [FirebaseModule, RedisModule, ExercisesModule, ClientsModule],
  controllers: [AIController],
  providers: [
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: GeminiProvider },
    AICacheService,
    AIExerciseService,
    AIRecommendService,
    AIPrescriptionService,
  ],
})
export class AIModule {}
