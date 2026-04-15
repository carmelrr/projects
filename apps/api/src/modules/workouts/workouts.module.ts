import { Module } from '@nestjs/common';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';
import { WorkoutInstancesService } from './workout-instances.service';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutInstancesService],
  exports: [WorkoutsService, WorkoutInstancesService],
})
export class WorkoutsModule {}
