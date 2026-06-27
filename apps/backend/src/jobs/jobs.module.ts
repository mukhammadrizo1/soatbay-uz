import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobPublishService } from './job-publish.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobPublishService],
  exports: [JobsService, JobPublishService],
})
export class JobsModule {}
