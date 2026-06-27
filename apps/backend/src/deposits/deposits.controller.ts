import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DepositsService } from './deposits.service';
import { PaginationQuery } from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Get()
  list(@Query() q: PaginationQuery) {
    return this.deposits.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.deposits.detail(id);
  }
}
