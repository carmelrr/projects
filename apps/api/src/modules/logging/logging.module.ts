import { Module } from '@nestjs/common';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { ComplianceService } from './compliance.service';

@Module({
  controllers: [LoggingController],
  providers: [LoggingService, ComplianceService],
  exports: [LoggingService, ComplianceService],
})
export class LoggingModule {}
