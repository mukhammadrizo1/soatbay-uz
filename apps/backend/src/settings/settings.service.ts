import { Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from '@soatbay/shared-types';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Settings> {
    const existing = await this.prisma.settings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    // Seed ishlamagan bo'lsa, standart qiymatlarni kerak bo'lganda yaratadi.
    return this.prisma.settings.create({
      data: {
        id: 1,
        cardNumber: process.env.DEFAULT_CARD_NUMBER ?? '5614 6819 1147 9941',
        cardHolderName:
          process.env.DEFAULT_CARD_HOLDER ?? "Raximov Otaboy Ergash o'g'li",
      },
    });
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    await this.get();
    return this.prisma.settings.update({
      where: { id: 1 },
      data: {
        cardNumber: dto.cardNumber,
        cardHolderName: dto.cardHolderName,
        vipPrice: dto.vipPrice,
      },
    });
  }
}
