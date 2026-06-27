import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelegramNotifyService } from '../notify/telegram-notify.service';

/**
 * Telegram fayllarini (passport suratlari, to'lov cheklari, masofa
 * skrinshotlari, shikoyat ilovalari) proksilaydi, shunda admin panel ularni
 * bot tokenini oshkor qilmasdan ko'rsata oladi. `which` segmenti file_id
 * egasi bo'lgan botni tanlaydi (ishchi-bot deyarli barcha medianini saqlaydi).
 */
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly telegram: TelegramNotifyService) {}

  @Get(':which/:fileId')
  async getFile(
    @Param('which') which: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const bot = which === 'employer' ? 'employer' : 'worker';
    const file = await this.telegram.getFile(bot, fileId);
    if (!file) {
      throw new NotFoundException('File not available');
    }
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.buffer);
  }
}
