import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ComplaintsService } from './complaints.service';
import {
  PaginationQuery,
  UpdateComplaintStatusDto,
} from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Get()
  list(@Query() q: PaginationQuery) {
    return this.complaints.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.complaints.detail(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.complaints.updateStatus(id, dto);
  }
}
