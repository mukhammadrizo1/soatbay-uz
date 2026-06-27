import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  BalanceTransactionType,
  JobPostStatus,
  PendingRequest,
  PendingRequestType,
  RequestStatus,
} from '@prisma/client';
import { autoServiceFee, formatSom, MSG } from '@soatbay/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotifyService } from '../notify/telegram-notify.service';
import { BalanceService } from '../balance/balance.service';
import { JobPublishService } from '../jobs/job-publish.service';
import { SettingsService } from '../settings/settings.service';
import { buildResult, parsePagination } from '../common/pagination';
import { PaginationQuery } from '@soatbay/shared-types';

@Injectable()
export class PendingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TelegramNotifyService,
    private readonly balance: BalanceService,
    private readonly publisher: JobPublishService,
    private readonly settings: SettingsService,
  ) {}

  async list(type: PendingRequestType, q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = { type, status: RequestStatus.pending };
    const [items, total] = await Promise.all([
      this.prisma.pendingRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          employer: true,
          worker: true,
          jobPost: { include: { employer: true } },
          application: {
            include: {
              worker: true,
              jobPost: { include: { employer: true } },
            },
          },
        },
      }),
      this.prisma.pendingRequest.count({ where }),
    ]);
    return buildResult(items, total, page, pageSize);
  }

  async detail(type: PendingRequestType, id: string) {
    const req = await this.prisma.pendingRequest.findFirst({
      where: { id, type },
      include: {
        employer: true,
        worker: true,
        jobPost: { include: { employer: true } },
        application: {
          include: {
            worker: true,
            jobPost: { include: { employer: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('Pending request not found');
    return req;
  }

  async approvePost(id: string, serviceFee?: number | null) {
    const req = await this.getReq(id, PendingRequestType.post);
    if (!req.jobPostId) throw new BadRequestException('No job post linked');
    const post = await this.prisma.jobPost.findUnique({
      where: { id: req.jobPostId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const fee =
      serviceFee != null && serviceFee > 0
        ? serviceFee
        : autoServiceFee(post.salaryPerPerson);

    const updated = await this.prisma.jobPost.update({
      where: { id: post.id },
      data: { serviceFee: fee, status: JobPostStatus.approved },
    });
    await this.publisher.publishToChannel(updated);
    await this.resolve(req, RequestStatus.approved);

    await this.notifyEmployer(
      req.employerId,
      `✅ E'loningiz tasdiqlandi va kanalga joylandi.\nE'lon ID: #${updated.seq}`,
    );
    return { ok: true, serviceFee: fee };
  }

  async warnPost(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.post);
    if (req.jobPostId) {
      await this.prisma.jobPost.update({
        where: { id: req.jobPostId },
        data: { status: JobPostStatus.rejected },
      });
    }
    await this.notifyEmployer(
      req.employerId,
      message?.trim() || MSG.admin.postWarnDefault,
    );
    await this.resolve(req, RequestStatus.warned);
    return { ok: true };
  }

  async blockOrCancelPost(id: string, message?: string, block = true) {
    const req = await this.getReq(id, PendingRequestType.post);
    const text = message?.trim()
      ? `${MSG.admin.postBlock}\n\n${message.trim()}`
      : MSG.admin.postBlock;
    if (block) await this.blockEmployer(req.employerId, message);
    await this.notifyEmployer(req.employerId, text);
    await this.resolve(req, block ? RequestStatus.blocked : RequestStatus.rejected);
    return { ok: true };
  }

  async approveTopup(id: string) {
    const req = await this.getReq(id, PendingRequestType.topup);
    if (!req.workerId) throw new BadRequestException('No worker linked');
    const payload = req.payload as { amount?: number; depositId?: string };
    const amount = Number(payload.amount ?? 0);
    if (amount <= 0) throw new BadRequestException('Invalid amount in payload');
    const depositId = payload.depositId;

    const newBalance = await this.balance.adjust(
      req.workerId,
      amount,
      BalanceTransactionType.topup,
      { source: 'deposit', depositId, pendingRequestId: id },
    );
    if (depositId) {
      await this.prisma.depositRequest.update({
        where: { id: depositId },
        data: { status: RequestStatus.approved },
      });
    } else {
      await this.prisma.depositRequest.updateMany({
        where: { workerId: req.workerId, status: RequestStatus.pending },
        data: { status: RequestStatus.approved },
      });
    }
    await this.resolve(req, RequestStatus.approved);
    await this.notifyWorker(
      req.workerId,
      `✅ Hisobingiz to'ldirildi: +${formatSom(amount)}\nJoriy hisob: ${formatSom(newBalance)}`,
    );
    return { ok: true, balance: newBalance };
  }

  async warnTopup(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.topup);
    await this.rejectPendingDeposits(req.workerId);
    await this.notifyWorker(
      req.workerId,
      message?.trim() || MSG.admin.topupWarnDefault,
    );
    await this.resolve(req, RequestStatus.warned);
    return { ok: true };
  }

  async cancelTopup(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.topup);
    const text = message?.trim()
      ? `${MSG.admin.topupCancel}\n\n${message.trim()}`
      : MSG.admin.topupCancel;
    await this.rejectPendingDeposits(req.workerId);
    await this.notifyWorker(req.workerId, text);
    await this.resolve(req, RequestStatus.rejected);
    return { ok: true };
  }

  async blockTopup(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.topup);
    const text = message?.trim()
      ? `${MSG.admin.topupCancel}\n\n${message.trim()}`
      : MSG.admin.topupCancel;
    await this.rejectPendingDeposits(req.workerId);
    await this.blockWorker(req.workerId, message);
    await this.notifyWorker(req.workerId, text);
    await this.resolve(req, RequestStatus.blocked);
    return { ok: true };
  }

  async approveRegistration(id: string) {
    const req = await this.getReq(id, PendingRequestType.registration);
    if (!req.workerId) throw new BadRequestException('No worker linked');
    await this.resolve(req, RequestStatus.approved);
    await this.notifyWorker(
      req.workerId,
      "✅ Ma'lumotlaringiz tasdiqlandi. Endi ishlarga yozilishingiz mumkin.",
    );
    return { ok: true };
  }

  async warnRegistration(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.registration);
    await this.notifyWorker(
      req.workerId,
      message?.trim() || MSG.admin.registrationWarnDefault,
    );
    await this.resolve(req, RequestStatus.warned);
    return { ok: true };
  }

  async blockRegistration(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.registration);
    await this.blockWorker(req.workerId, message);
    await this.notifyWorker(req.workerId, MSG.admin.registrationCancel);
    await this.resolve(req, RequestStatus.blocked);
    return { ok: true };
  }

  async cancelRegistration(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.registration);
    const text = message?.trim()
      ? `${MSG.admin.registrationCancel}\n\n${message.trim()}`
      : MSG.admin.registrationCancel;
    if (message?.trim()) await this.blockWorker(req.workerId, message);
    await this.notifyWorker(req.workerId, text);
    await this.resolve(req, RequestStatus.rejected);
    return { ok: true };
  }

  async approveApplication(id: string) {
    const req = await this.getReq(id, PendingRequestType.application);
    if (!req.applicationId) throw new BadRequestException('No application linked');
    const application = await this.prisma.application.findUnique({
      where: { id: req.applicationId },
      include: { jobPost: { include: { employer: true } }, worker: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (
      application.worker.telegramId &&
      application.jobPost.employer.telegramId &&
      application.worker.telegramId === application.jobPost.employer.telegramId
    ) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.rejected },
      });
      await this.resolve(req, RequestStatus.rejected);
      await this.notifyWorker(
        req.workerId,
        MSG.cannotApplyOwnPost,
      );
      return { ok: true, rejectedOwnPost: true };
    }

    const approvedCount = await this.prisma.application.count({
      where: {
        jobPostId: application.jobPostId,
        status: ApplicationStatus.approved,
      },
    });
    if (approvedCount >= application.jobPost.workersNeeded) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.cancelled },
      });
      if (
        application.feeCharged &&
        application.feeCharged > 0 &&
        application.paymentMethod !== 'vip'
      ) {
        await this.balance.adjust(
          application.workerId,
          application.feeCharged,
          BalanceTransactionType.refund,
          { reason: 'job full on approval', applicationId: application.id },
        );
      }
      await this.resolve(req, RequestStatus.rejected);
      await this.notifyWorker(
        req.workerId,
        `😔 #${application.jobPost.seq} e'lonida joylar to'lib qoldi. To'lovingiz qaytarildi.`,
      );
      return { ok: true, refunded: true };
    }

    await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.approved },
    });
    await this.resolve(req, RequestStatus.approved);
    await this.notifyWorker(
      req.workerId,
      MSG.worker.appliedSuccess(
        application.jobPost.employer.fullName,
        application.jobPost.contactPhone,
      ),
    );

    await this.publisher.closeIfFull(application.jobPostId);

    return { ok: true };
  }

  async warnApplication(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.application);
    if (req.applicationId) {
      await this.prisma.application.update({
        where: { id: req.applicationId },
        data: { status: ApplicationStatus.rejected },
      });
    }
    await this.notifyWorker(
      req.workerId,
      message?.trim() || MSG.admin.applicationWarnDefault,
    );
    await this.resolve(req, RequestStatus.warned);
    return { ok: true };
  }

  async cancelApplication(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.application);
    const text = message?.trim()
      ? `${MSG.admin.applicationCancel}\n\n${message.trim()}`
      : MSG.admin.applicationCancel;
    if (req.applicationId) {
      await this.prisma.application.update({
        where: { id: req.applicationId },
        data: { status: ApplicationStatus.rejected },
      });
    }
    await this.notifyWorker(req.workerId, text);
    await this.resolve(req, RequestStatus.rejected);
    return { ok: true };
  }

  async blockApplication(id: string, message?: string) {
    const req = await this.getReq(id, PendingRequestType.application);
    await this.blockWorker(req.workerId, message);
    if (req.applicationId) {
      await this.prisma.application.update({
        where: { id: req.applicationId },
        data: { status: ApplicationStatus.rejected },
      });
    }
    await this.notifyWorker(req.workerId, MSG.admin.applicationBlock);
    await this.resolve(req, RequestStatus.blocked);
    return { ok: true };
  }

  private async getReq(id: string, type: PendingRequestType): Promise<PendingRequest> {
    const req = await this.prisma.pendingRequest.findUnique({ where: { id } });
    if (!req || req.type !== type) {
      throw new NotFoundException('Pending request not found');
    }
    if (req.status !== RequestStatus.pending) {
      throw new BadRequestException('Request already processed');
    }
    return req;
  }

  private resolve(req: PendingRequest, status: RequestStatus) {
    return this.prisma.pendingRequest.update({
      where: { id: req.id },
      data: { status },
    });
  }

  private async rejectPendingDeposits(workerId: string | null) {
    if (!workerId) return;
    await this.prisma.depositRequest.updateMany({
      where: { workerId, status: RequestStatus.pending },
      data: { status: RequestStatus.rejected },
    });
  }

  private async blockEmployer(employerId: string | null, reason?: string) {
    if (!employerId) return;
    await this.prisma.employer.update({
      where: { id: employerId },
      data: { isBlocked: true, blockReason: reason?.trim() || null },
    });
  }

  private async blockWorker(workerId: string | null, reason?: string) {
    if (!workerId) return;
    await this.prisma.worker.update({
      where: { id: workerId },
      data: { isBlocked: true, blockReason: reason?.trim() || null },
    });
  }

  private async notifyEmployer(employerId: string | null, text: string) {
    if (!employerId) return;
    const employer = await this.prisma.employer.findUnique({
      where: { id: employerId },
    });
    if (!employer?.telegramId) return;
    await this.notify.notifyEmployer(employer.telegramId, text);
  }

  private async notifyWorker(workerId: string | null, text: string) {
    if (!workerId) return;
    const worker = await this.prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker?.telegramId) return;
    await this.notify.notifyWorker(worker.telegramId, text);
  }
}
