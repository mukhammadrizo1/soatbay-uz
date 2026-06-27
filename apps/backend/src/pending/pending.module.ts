import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { PendingController } from './pending.controller';
import { PendingService } from './pending.service';

@Module({
  imports: [JobsModule],
  controllers: [PendingController],
  providers: [PendingService],
})
export class PendingModule {}
