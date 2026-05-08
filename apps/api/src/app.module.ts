import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ClientsModule } from './modules/clients/clients.module';
import { HealthModule } from './modules/health/health.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { LoggingModule } from './modules/logging/logging.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { TrainingGroupsModule } from './modules/training-groups/training-groups.module';
import { AIModule } from './modules/ai/ai.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 60,  // 60 requests per minute default
      },
    ]),

    // Infrastructure
    FirebaseModule,
    RedisModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ClientsModule,
    ExercisesModule,
    ProgramsModule,
    WorkoutsModule,
    LoggingModule,
    MessagingModule,
    MetricsModule,
    NotificationsModule,
    AdminModule,
    TrainingGroupsModule,
    AIModule,
  ],
})
export class AppModule {}
