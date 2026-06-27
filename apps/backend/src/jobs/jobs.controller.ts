import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobPostStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsService } from './jobs.service';
import {
  CreateJobPostDto,
  PaginationQuery,
  UpdateJobPostDto,
} from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query() q: PaginationQuery & { status?: JobPostStatus }) {
    return this.jobs.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.jobs.detail(id);
  }

  @Post()
  create(@Body() dto: CreateJobPostDto) {
    return this.jobs.createAndPublish(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobPostDto) {
    return this.jobs.update(id, dto);
  }

  @Post(':id/workers')
  addWorker(@Param('id') id: string, @Body('workerId') workerId: string) {
    return this.jobs.addWorker(id, workerId);
  }

  @Post(':id/active')
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.jobs.setActive(id, active);
  }

  @Post(':id/closed')
  setClosed(@Param('id') id: string, @Body('closed') closed: boolean) {
    return this.jobs.setClosed(id, closed);
  }

  @Post(':id/republish')
  republish(@Param('id') id: string) {
    return this.jobs.republishToChannel(id);
  }

  @Post(':id/applications/remove')
  removeWorkers(
    @Param('id') id: string,
    @Body('applicationIds') applicationIds: string[],
  ) {
    return this.jobs.removeWorkers(id, applicationIds);
  }

  @Delete(':id/applications/:applicationId')
  removeWorker(
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.jobs.removeWorker(id, applicationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobs.remove(id);
  }
}
