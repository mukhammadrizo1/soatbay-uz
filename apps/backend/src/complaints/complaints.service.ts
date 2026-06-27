import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintStatus as PrismaComplaintStatus, Prisma } from '@prisma/client';
import {
  ComplaintStatus,
  PaginationQuery,
  UpdateComplaintStatusDto,
} from '@soatbay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotifyService } from '../notify/telegram-notify.service';
import { buildResult, parsePagination } from '../common/pagination';

/** Shared-types qiymatini (`in-progress`) Prisma enum (`in_progress`) ga moslaydi. */
const TO_PRISMA: Record<ComplaintStatus, PrismaComplaintStatus> = {
  [ComplaintStatus.NEW]: PrismaComplaintStatus.new,
  [ComplaintStatus.IN_PROGRESS]: PrismaComplaintStatus.in_progress,
  [ComplaintStatus.RESOLVED]: PrismaComplaintStatus.resolved,
};

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TelegramNotifyService,
  ) {}

  async list(q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const statusFilter =
      q.status && q.status in TO_PRISMA
        ? TO_PRISMA[q.status as ComplaintStatus]
        : undefined;
    const where: Prisma.ComplaintWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { worker: true },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return buildResult(items, total, page, pageSize);
  }

  async detail(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async updateStatus(id: string, dto: UpdateComplaintStatusDto) {
    const complaint = await this.detail(id);
    const status = TO_PRISMA[dto.status];
    if (!status) throw new BadRequestException('Invalid status');
    if (
      status === PrismaComplaintStatus.resolved &&
      !dto.adminNote?.trim()
    ) {
      throw new BadRequestException('Yakunlash uchun admin javobi kerak');
    }
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        status,
        adminNote: dto.adminNote?.trim() || complaint.adminNote,
      },
    });

    if (complaint.worker.telegramId) {
      if (status === PrismaComplaintStatus.in_progress) {
        await this.notify.notifyWorker(
          complaint.worker.telegramId,
          `🔎 #${complaint.seq} shikoyatingiz ko'rib chiqilmoqda.`,
        );
      } else if (status === PrismaComplaintStatus.resolved) {
        await this.notify.notifyWorker(
          complaint.worker.telegramId,
          `✅ #${complaint.seq} shikoyatingiz yakunlandi.\n\n${dto.adminNote!.trim()}`,
        );
      }
    }
    return updated;
  }
}
