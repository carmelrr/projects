import { Module } from '@nestjs/common';
import { TrainingGroupsController } from './training-groups.controller';
import { TrainingGroupsService } from './training-groups.service';
import { ClientsModule } from '../clients/clients.module';
import { ProgramsModule } from '../programs/programs.module';

@Module({
  imports: [ClientsModule, ProgramsModule],
  controllers: [TrainingGroupsController],
  providers: [TrainingGroupsService],
})
export class TrainingGroupsModule {}