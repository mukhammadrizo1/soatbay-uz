import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BalanceTransactionType, PendingRequestType, RequestStatus } from '@prisma/client';
import {
  AdjustBalanceDto,
  PaginationQuery,
  ToggleVipDto,
  UpdateWorkerDto,
} from '@soatbay/shared-types';
import { formatSom, MSG } from '@soatbay/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';
import { TelegramNotifyService } from '../notify/telegram-notify.service';
import { SettingsService } from '../settings/settings.service';
import { buildResult, parsePagination } from '../common/pagination';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
    private readonly notify: TelegramNotifyService,
    private readonly settings: SettingsService,
  ) {}

  private searchWhere(search?: string) {
    const term = search?.trim();
    const seqNum = term && /^\d+$/.test(term) ? Number(term) : undefined;
    if (!term) return {};
    return {
      OR: [
        { fullName: { contains: term, mode: 'insensitive' as const } },
        { phone: { contains: term } },
        { telegramId: { contains: term } },
        ...(seqNum !== undefined ? [{ seq: seqNum }] : []),
      ],
    };
  }

  listClients(q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = this.searchWhere(q.search);
    return Promise.all([
      this.prisma.employer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employer.count({ where }),
    ]).then(([items, total]) => buildResult(items, total, page, pageSize));
  }

  async clientDetail(id: string) {
    const client = await this.prisma.employer.findUnique({
      where: { id },
      include: { jobPosts: { orderBy: { createdAt: 'desc' } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    const activity = await this.prisma.auditLog.findMany({
      where: { actorType: 'user', actorId: client.telegramId ?? id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { ...client, activity };
  }

  listWorkers(q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = this.searchWhere(q.search);
    return Promise.all([
      this.prisma.worker.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.worker.count({ where }),
    ]).then(([items, total]) => buildResult(items, total, page, pageSize));
  }

  async workerDetail(id: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        balanceTransactions: { orderBy: { createdAt: 'desc' }, take: 100 },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { jobPost: true },
          take: 100,
        },
      },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    const balanceTransactions = await this.enrichBalanceTransactions(
      worker.id,
      worker.balanceTransactions,
    );
    return { ...worker, balanceTransactions };
  }

  private async enrichBalanceTransactions(
    workerId: string,
    transactions: {
      id: string;
      amount: number;
      type: string;
      balanceAfter: number;
      meta: unknown;
      createdAt: Date;
    }[],
  ) {
    type Meta = {
      depositId?: string;
      pendingRequestId?: string;
      applicationId?: string;
    };

    const depositIds = new Set<string>();
    const pendingIds = new Set<string>();
    const applicationIds = new Set<string>();

    for (const t of transactions) {
      const meta = (t.meta ?? {}) as Meta;
      if (meta.depositId) depositIds.add(meta.depositId);
      if (meta.pendingRequestId) pendingIds.add(meta.pendingRequestId);
      if (meta.applicationId) applicationIds.add(meta.applicationId);
    }

    const pendingToDeposit = new Map<string, string>();
    if (pendingIds.size) {
      const pending = await this.prisma.pendingRequest.findMany({
        where: { id: { in: [...pendingIds] } },
        select: { id: true, payload: true },
      });
      for (const p of pending) {
        const depositId = (p.payload as Meta)?.depositId;
        if (depositId) {
          pendingToDeposit.set(p.id, depositId);
          depositIds.add(depositId);
        }
      }
    }

    const depositById = new Map<string, { id: string; seq: number }>();
    if (depositIds.size) {
      const deposits = await this.prisma.depositRequest.findMany({
        where: { id: { in: [...depositIds] } },
        select: { id: true, seq: true },
      });
      for (const d of deposits) depositById.set(d.id, d);
    }

    const applicationById = new Map<string, { id: string; seq: number }>();
    if (applicationIds.size) {
      const apps = await this.prisma.application.findMany({
        where: { id: { in: [...applicationIds] } },
        select: { id: true, seq: true },
      });
      for (const a of apps) applicationById.set(a.id, a);
    }

    const legacyTopups = transactions.filter((t) => {
      if (t.type !== BalanceTransactionType.topup) return false;
      const meta = (t.meta ?? {}) as Meta;
      const depositId =
        meta.depositId ??
        (meta.pendingRequestId
          ? pendingToDeposit.get(meta.pendingRequestId)
          : undefined);
      return !depositId;
    });
    const legacyDepositMap = new Map<string, { id: string; seq: number }>();
    if (legacyTopups.length) {
      const deposits = await this.prisma.depositRequest.findMany({
        where: { workerId, status: 'approved' },
        select: { id: true, seq: true, amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const t of legacyTopups) {
        const match = deposits.find(
          (d) =>
            d.amount === t.amount &&
            Math.abs(d.createdAt.getTime() - t.createdAt.getTime()) <
              24 * 60 * 60 * 1000,
        );
        if (match) {
          legacyDepositMap.set(t.id, match);
          depositById.set(match.id, match);
        }
      }
    }

    return transactions.map((t) => {
      const meta = (t.meta ?? {}) as Meta;
      let depositId =
        meta.depositId ??
        (meta.pendingRequestId
          ? pendingToDeposit.get(meta.pendingRequestId)
          : undefined);
      if (!depositId) depositId = legacyDepositMap.get(t.id)?.id;

      const deposit = depositId
        ? depositById.get(depositId) ?? legacyDepositMap.get(t.id)
        : undefined;
      const application = meta.applicationId
        ? applicationById.get(meta.applicationId)
        : undefined;

      return {
        id: t.id,
        amount: t.amount,
        type: t.type,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
        depositId: deposit?.id ?? null,
        depositSeq: deposit?.seq ?? null,
        applicationId: application?.id ?? null,
        applicationSeq: application?.seq ?? null,
      };
    });
  }

  async updateWorker(id: string, dto: UpdateWorkerDto) {
    await this.ensureWorker(id);
    return this.prisma.worker.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        age: dto.age,
        passportPhotoUrl: dto.passportPhotoUrl,
      },
    });
  }

  async deleteWorker(id: string) {
    await this.ensureWorker(id);
    await this.prisma.worker.delete({ where: { id } });
    return { deleted: true };
  }

  async adjustBalance(id: string, dto: AdjustBalanceDto) {
    const worker = await this.ensureWorker(id);
    const newBalance = await this.balance.adjust(
      id,
      dto.amount,
      BalanceTransactionType.admin_adjust,
      { reason: dto.reason ?? 'admin adjust' },
    );
    if (worker.telegramId) {
      await this.notify.notifyWorker(
        worker.telegramId,
        `💰 Hisobingiz o'zgartirildi. Yangi hisob: ${formatSom(newBalance)}`,
      );
    }
    return { balance: newBalance };
  }

  async toggleWorkerVip(id: string, dto: ToggleVipDto) {
    const worker = await this.ensureWorker(id);
    const settings = await this.settings.get();
    const data: { isVip: boolean; vipExpiresAt?: Date } = { isVip: dto.enabled };
    if (dto.enabled) {
      data.vipExpiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : new Date(Date.now() + settings.vipDurationDays * 24 * 60 * 60 * 1000);
    }
    const updated = await this.prisma.worker.update({ where: { id }, data });
    if (worker.telegramId) {
      const expText = updated.vipExpiresAt
        ? `Amal qilish muddati: ${updated.vipExpiresAt.toLocaleDateString('uz-UZ')} gacha.`
        : '';
      await this.notify.notifyWorker(
        worker.telegramId,
        dto.enabled
          ? `🌟 Sizga VIP tarifi yoqildi! ${expText}`
          : "🌟 Sizning VIP tarifingiz o'chirildi.",
      );
    }
    return updated;
  }

  async toggleClientVip(id: string, dto: ToggleVipDto) {
    const client = await this.ensureClient(id);
    const settings = await this.settings.get();
    const data: { isVip: boolean; vipExpiresAt?: Date } = { isVip: dto.enabled };
    if (dto.enabled) {
      data.vipExpiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : new Date(Date.now() + settings.vipDurationDays * 24 * 60 * 60 * 1000);
    }
    const updated = await this.prisma.employer.update({ where: { id }, data });
    if (client.telegramId) {
      const expText = updated.vipExpiresAt
        ? `Amal qilish muddati: ${updated.vipExpiresAt.toLocaleDateString('uz-UZ')} gacha.`
        : '';
      await this.notify.notifyEmployer(
        client.telegramId,
        dto.enabled
          ? `🌟 Sizga VIP tarifi yoqildi! ${expText}`
          : "🌟 Sizning VIP tarifingiz o'chirildi.",
      );
    }
    return updated;
  }

  async blockClient(id: string, blocked: boolean, reason?: string) {
    const client = await this.ensureClient(id);
    const updated = await this.prisma.employer.update({
      where: { id },
      data: blocked
        ? { isBlocked: true, blockReason: reason?.trim() || null }
        : { isBlocked: false, blockReason: null },
    });
    if (client.telegramId) {
      await this.notify.notifyEmployer(
        client.telegramId,
        blocked
          ? MSG.blocked(updated.blockReason)
          : '✅ Hisobingiz blokdan chiqarildi.',
      );
    }
    return updated;
  }

  async blockWorker(id: string, blocked: boolean, reason?: string) {
    const worker = await this.ensureWorker(id);
    const updated = await this.prisma.worker.update({
      where: { id },
      data: blocked
        ? { isBlocked: true, blockReason: reason?.trim() || null }
        : { isBlocked: false, blockReason: null },
    });
    if (worker.telegramId) {
      await this.notify.notifyWorker(
        worker.telegramId,
        blocked
          ? MSG.blocked(updated.blockReason)
          : '✅ Hisobingiz blokdan chiqarildi.',
      );
    }
    return updated;
  }

  async deleteClient(id: string) {
    const client = await this.ensureClient(id);
    const posts = await this.prisma.jobPost.findMany({
      where: { employerId: id },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id);
    if (postIds.length) {
      await this.prisma.application.deleteMany({
        where: { jobPostId: { in: postIds } },
      });
      await this.prisma.jobPost.deleteMany({ where: { id: { in: postIds } } });
    }
    await this.prisma.employer.delete({ where: { id } });
    return { deleted: true, userSeq: client.seq };
  }

  /** Mijozni qayta ro'yxatdan o'tkazish: botda F.I.O. va telefon qayta kiritiladi. */
  async reregisterClient(id: string) {
    const client = await this.ensureClient(id);
    if (!client.telegramId) {
      throw new BadRequestException('Mijozda Telegram id yo\'q');
    }
    const updated = await this.prisma.employer.update({
      where: { id },
      data: { needsReregistration: true },
    });
    await this.notify.notifyEmployer(
      client.telegramId,
      MSG.adminReregisterClient,
    );
    return { ok: true, needsReregistration: updated.needsReregistration };
  }

  /** Ishchini qayta ro'yxatdan o'tkazish: oferta + ma'lumotlar + admin tasdiqi. */
  async reregisterWorker(id: string) {
    const worker = await this.ensureWorker(id);
    if (!worker.telegramId) {
      throw new BadRequestException('Ishchida Telegram id yo\'q');
    }
    await this.prisma.$transaction([
      this.prisma.worker.update({
        where: { id },
        data: {
          offerAccepted: false,
          age: null,
          passportPhotoUrl: null,
        },
      }),
      this.prisma.pendingRequest.updateMany({
        where: {
          workerId: id,
          type: PendingRequestType.registration,
          status: RequestStatus.pending,
        },
        data: { status: RequestStatus.rejected },
      }),
    ]);
    await this.notify.notifyWorker(worker.telegramId, MSG.adminReregisterWorker);
    return { ok: true, offerAccepted: false };
  }

  async sendMessage(
    id: string,
    text: string | undefined,
    media: { buffer: Buffer; kind: 'photo' | 'video'; filename?: string } | null,
  ) {
    const employer = await this.prisma.employer.findUnique({ where: { id } });
    const worker = employer
      ? null
      : await this.prisma.worker.findUnique({ where: { id } });
    const recipient = employer ?? worker;
    if (!recipient) throw new NotFoundException('User not found');
    if (!recipient.telegramId) {
      throw new BadRequestException('User has no Telegram id');
    }
    if (!text?.trim() && !media) {
      throw new BadRequestException('Empty message');
    }
    const which = employer ? 'employer' : 'worker';
    const ok = await this.notify.sendMediaToUser(
      which,
      recipient.telegramId,
      media,
      text?.trim() || undefined,
    );
    return { sent: ok };
  }

  private async ensureClient(id: string) {
    const client = await this.prisma.employer.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async ensureWorker(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }
}
