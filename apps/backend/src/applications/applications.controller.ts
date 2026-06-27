import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplicationsService } from './applications.service';
import { PaginationQuery } from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@Query() q: PaginationQuery) {
    return this.applications.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.applications.detail(id);
  }
}
