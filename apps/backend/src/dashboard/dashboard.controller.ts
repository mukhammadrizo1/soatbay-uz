import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboard.stats();
  }

  @Get('profit')
  profit(@Query() q: { from?: string; to?: string; date?: string }) {
    return this.dashboard.profit(q);
  }
}
