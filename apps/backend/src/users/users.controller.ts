import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Multipart yuklamasi (tsconfig types ga "multer" qo'shmaslik uchun minimal tur). */
interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}
import { UsersService } from './users.service';
import {
  AdjustBalanceDto,
  BlockUserDto,
  PaginationQuery,
  ToggleVipDto,
  UpdateWorkerDto,
} from '@soatbay/shared-types';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ── Mijozlar ──
  @Get('clients')
  listClients(@Query() q: PaginationQuery) {
    return this.users.listClients(q);
  }

  @Get('clients/:id')
  clientDetail(@Param('id') id: string) {
    return this.users.clientDetail(id);
  }

  @Post('clients/:id/block')
  blockClient(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.users.blockClient(id, true, dto.reason);
  }

  @Post('clients/:id/unblock')
  unblockClient(@Param('id') id: string) {
    return this.users.blockClient(id, false);
  }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) {
    return this.users.deleteClient(id);
  }

  @Post('clients/:id/vip')
  toggleClientVip(@Param('id') id: string, @Body() dto: ToggleVipDto) {
    return this.users.toggleClientVip(id, dto);
  }

  @Post('clients/:id/reregister')
  reregisterClient(@Param('id') id: string) {
    return this.users.reregisterClient(id);
  }

  // ── Ishchilar ──
  @Get('workers')
  listWorkers(@Query() q: PaginationQuery) {
    return this.users.listWorkers(q);
  }

  @Get('workers/:id')
  workerDetail(@Param('id') id: string) {
    return this.users.workerDetail(id);
  }

  @Patch('workers/:id')
  updateWorker(@Param('id') id: string, @Body() dto: UpdateWorkerDto) {
    return this.users.updateWorker(id, dto);
  }

  @Delete('workers/:id')
  deleteWorker(@Param('id') id: string) {
    return this.users.deleteWorker(id);
  }

  @Post('workers/:id/block')
  blockWorker(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.users.blockWorker(id, true, dto.reason);
  }

  @Post('workers/:id/unblock')
  unblockWorker(@Param('id') id: string) {
    return this.users.blockWorker(id, false);
  }

  @Post('workers/:id/balance')
  adjustBalance(@Param('id') id: string, @Body() dto: AdjustBalanceDto) {
    return this.users.adjustBalance(id, dto);
  }

  @Post('workers/:id/vip')
  toggleVip(@Param('id') id: string, @Body() dto: ToggleVipDto) {
    return this.users.toggleWorkerVip(id, dto);
  }

  @Post('workers/:id/reregister')
  reregisterWorker(@Param('id') id: string) {
    return this.users.reregisterWorker(id);
  }

  // ── Foydalanuvchiga xabar yuborish (matn + ixtiyoriy rasm/video) ──
  @Post('users/:id/message')
  @UseInterceptors(FileInterceptor('file'))
  sendMessage(
    @Param('id') id: string,
    @Body('text') text: string | undefined,
    @UploadedFile() file?: UploadedFileLike,
  ) {
    const media = file
      ? {
          buffer: file.buffer,
          kind: file.mimetype?.startsWith('video/')
            ? ('video' as const)
            : ('photo' as const),
          filename: file.originalname,
        }
      : null;
    return this.users.sendMessage(id, text, media);
  }
}
