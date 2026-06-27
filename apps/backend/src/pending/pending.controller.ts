import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PendingRequestType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PendingService } from './pending.service';
import {
  ApproveJobPostDto,
  PaginationQuery,
  RejectWithMessageDto,
} from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('pending')
export class PendingController {
  constructor(private readonly pending: PendingService) {}

  // ── Tab ro'yxatlari ──
  @Get('posts')
  listPosts(@Query() q: PaginationQuery) {
    return this.pending.list(PendingRequestType.post, q);
  }

  @Get('posts/:id')
  detailPost(@Param('id') id: string) {
    return this.pending.detail(PendingRequestType.post, id);
  }

  @Get('topups')
  listTopups(@Query() q: PaginationQuery) {
    return this.pending.list(PendingRequestType.topup, q);
  }

  @Get('topups/:id')
  detailTopup(@Param('id') id: string) {
    return this.pending.detail(PendingRequestType.topup, id);
  }

  @Get('registrations')
  listRegistrations(@Query() q: PaginationQuery) {
    return this.pending.list(PendingRequestType.registration, q);
  }

  @Get('registrations/:id')
  detailRegistration(@Param('id') id: string) {
    return this.pending.detail(PendingRequestType.registration, id);
  }

  @Get('applications')
  listApplications(@Query() q: PaginationQuery) {
    return this.pending.list(PendingRequestType.application, q);
  }

  @Get('applications/:id')
  detailApplication(@Param('id') id: string) {
    return this.pending.detail(PendingRequestType.application, id);
  }

  // ── E'lon so'rovi amallari ──
  @Post('posts/:id/approve')
  approvePost(@Param('id') id: string, @Body() dto: ApproveJobPostDto) {
    return this.pending.approvePost(id, dto.serviceFee);
  }

  @Post('posts/:id/warn')
  warnPost(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.warnPost(id, dto.message);
  }

  @Post('posts/:id/block')
  blockPost(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.blockOrCancelPost(id, dto.message, true);
  }

  @Post('posts/:id/cancel')
  cancelPost(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.blockOrCancelPost(id, dto.message, false);
  }

  // ── Hisob to'ldirish so'rovi amallari ──
  @Post('topups/:id/approve')
  approveTopup(@Param('id') id: string) {
    return this.pending.approveTopup(id);
  }

  @Post('topups/:id/warn')
  warnTopup(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.warnTopup(id, dto.message);
  }

  @Post('topups/:id/cancel')
  cancelTopup(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.cancelTopup(id, dto.message);
  }

  @Post('topups/:id/block')
  blockTopup(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.blockTopup(id, dto.message);
  }

  // ── Ro'yxatdan o'tish so'rovi amallari ──
  @Post('registrations/:id/approve')
  approveRegistration(@Param('id') id: string) {
    return this.pending.approveRegistration(id);
  }

  @Post('registrations/:id/warn')
  warnRegistration(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.warnRegistration(id, dto.message);
  }

  @Post('registrations/:id/block')
  blockRegistration(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.blockRegistration(id, dto.message);
  }

  @Post('registrations/:id/cancel')
  cancelRegistration(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.cancelRegistration(id, dto.message);
  }

  // ── Yozilish so'rovi amallari ──
  @Post('applications/:id/approve')
  approveApplication(@Param('id') id: string) {
    return this.pending.approveApplication(id);
  }

  @Post('applications/:id/warn')
  warnApplication(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.warnApplication(id, dto.message);
  }

  @Post('applications/:id/cancel')
  cancelApplication(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.cancelApplication(id, dto.message);
  }

  @Post('applications/:id/block')
  blockApplication(@Param('id') id: string, @Body() dto: RejectWithMessageDto) {
    return this.pending.blockApplication(id, dto.message);
  }
}
