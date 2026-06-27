import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  BalanceTransactionType,
  JobMeal,
  JobPostStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateJobPostDto,
  PaginationQuery,
  UpdateJobPostDto,
} from '@soatbay/shared-types';
import { normalizePhone, resolveStartDate } from '@soatbay/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';
import { TelegramNotifyService } from '../notify/telegram-notify.service';
import { JobPublishService } from './job-publish.service';
import { buildResult, parsePagination } from '../common/pagination';

const mealMap: Record<string, JobMeal> = {
  '1 mahal': JobMeal.ONCE,
  '2 mahal': JobMeal.TWICE,
  "yo'q": JobMeal.NONE,
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TelegramNotifyService,
    private readonly publisher: JobPublishService,
    private readonly balance: BalanceService,
  ) {}

  async list(q: PaginationQuery & { status?: JobPostStatus }) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Prisma.JobPostWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to
        ? {
            startDate: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.search ? { address: { contains: q.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.jobPost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { employer: true, _count: { select: { applications: true } } },
      }),
      this.prisma.jobPost.count({ where }),
    ]);
    return buildResult(items, total, page, pageSize);
  }

  async detail(id: string) {
    const post = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        employer: true,
        applications: { include: { worker: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /**
   * Admin "E'lon yaratish": mavjud mijozni tanlaydi yoki yangi mijoz yaratadi,
   * e'lonni `createdByAdmin=true` bilan yaratadi va darhol kanalga joylaydi.
   */
  async createAndPublish(dto: CreateJobPostDto) {
    const employerId = await this.resolveEmployer(dto);
    const post = await this.prisma.jobPost.create({
      data: {
        ...this.toCreateData(dto, employerId, JobPostStatus.approved),
        createdByAdmin: true,
      },
    });
    await this.publisher.publishToChannel(post);
    return this.detail(post.id);
  }

  /** employerId berilsa uni tekshiradi; bo'lmasa clientName/clientPhone bilan mijoz yaratadi yoki topadi. */
  private async resolveEmployer(dto: CreateJobPostDto): Promise<string> {
    if (dto.employerId) {
      const exists = await this.prisma.employer.findUnique({
        where: { id: dto.employerId },
      });
      if (!exists) throw new NotFoundException('Client not found');
      return exists.id;
    }
    const phone = dto.clientPhone ? normalizePhone(dto.clientPhone) : null;
    if (!dto.clientName?.trim() || !phone) {
      throw new BadRequestException(
        'Mijoz tanlang yoki ism va telefon kiriting',
      );
    }
    const existing = await this.prisma.employer.findUnique({ where: { phone } });
    if (existing) return existing.id;
    const created = await this.prisma.employer.create({
      data: {
        fullName: dto.clientName.trim(),
        phone,
      },
    });
    return created.id;
  }

  async update(id: string, dto: UpdateJobPostDto) {
    const post = await this.prisma.jobPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.jobPost.update({
      where: { id },
      data: {
        workersNeeded: dto.workersNeeded,
        salaryPerPerson: dto.salaryPerPerson,
        meal: dto.meal ? mealMap[dto.meal] : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        address: dto.address,
        buses: dto.buses,
        description: dto.description,
        contactPhone: dto.contactPhone,
        serviceFee: dto.serviceFee,
        status: dto.status,
        locationLat: dto.location?.lat,
        locationLng: dto.location?.lng,
      },
    });
  }

  async setActive(postId: string, active: boolean) {
    const post = await this.prisma.jobPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!post.channelMessageId) {
      throw new BadRequestException("E'lon kanalda joylanmagan");
    }
    if (active) {
      if (post.status === JobPostStatus.closed) {
        throw new BadRequestException("Yopiq e'loni faollashtirib bo'lmaydi");
      }
      if (
        post.status !== JobPostStatus.approved &&
        post.status !== JobPostStatus.inactive
      ) {
        throw new BadRequestException(
          "Faqat tasdiqlangan yoki nofaol e'loni faollashtirish mumkin",
        );
      }
      await this.prisma.jobPost.update({
        where: { id: postId },
        data: { status: JobPostStatus.approved },
      });
    } else {
      if (post.status !== JobPostStatus.approved) {
        throw new BadRequestException("Faqat ochiq e'loni nofaol qilish mumkin");
      }
      await this.prisma.jobPost.update({
        where: { id: postId },
        data: { status: JobPostStatus.inactive },
      });
    }
    await this.publisher.refreshChannelPost(postId);
    return this.detail(postId);
  }

  /** E'lonni ochiq/yopiq holatga o'tkazadi (kanal kartasi yangilanadi). */
  async setClosed(postId: string, closed: boolean) {
    const post = await this.detail(postId);
    if (!post.channelMessageId) {
      throw new BadRequestException("E'lon kanalda joylanmagan");
    }
    if (closed) {
      if (post.status === JobPostStatus.inactive) {
        throw new BadRequestException("Nofaol e'loni yopib bo'lmaydi");
      }
      await this.prisma.jobPost.update({
        where: { id: postId },
        data: { status: JobPostStatus.closed },
      });
    } else {
      const approvedCount = post.applications.filter(
        (a) => a.status === ApplicationStatus.approved,
      ).length;
      if (approvedCount >= post.workersNeeded) {
        throw new BadRequestException('Barcha joylar band');
      }
      await this.prisma.jobPost.update({
        where: { id: postId },
        data: { status: JobPostStatus.approved },
      });
    }
    await this.publisher.refreshChannelPost(postId);
    return this.detail(postId);
  }

  /** Kanaldagi xabarni joriy ma'lumotlar bo'yicha yangilaydi yoki qayta joylaydi. */
  async republishToChannel(postId: string) {
    const post = await this.prisma.jobPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.publisher.republishToChannel(postId);
    return this.detail(postId);
  }

  /** E'longa ishchi qo'shadi, e'lon egasiga xabar beradi va to'lganda yopadi. */
  async addWorker(postId: string, workerId: string) {
    const post = await this.detail(postId);
    if (
      post.status === JobPostStatus.closed ||
      post.status === JobPostStatus.inactive
    ) {
      throw new BadRequestException("E'lon yopiq yoki nofaol");
    }
    const worker = await this.prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Worker not found');
    if (
      worker.telegramId &&
      post.employer.telegramId &&
      worker.telegramId === post.employer.telegramId
    ) {
      throw new BadRequestException("O'z e'loningizga ishchi qo'shib bo'lmaydi");
    }

    const existing = await this.prisma.application.findFirst({
      where: {
        jobPostId: postId,
        workerId,
        status: { in: [ApplicationStatus.approved, ApplicationStatus.pending] },
      },
    });
    if (existing) {
      throw new BadRequestException('Ishchi allaqachon bu e\'londa');
    }

    const approvedCount = post.applications.filter(
      (a) => a.status === ApplicationStatus.approved,
    ).length;
    if (approvedCount >= post.workersNeeded) {
      throw new BadRequestException('E\'lon uchun joylar to\'lgan');
    }

    await this.prisma.application.create({
      data: {
        jobPostId: postId,
        workerId,
        jobDate: post.startDate,
        status: ApplicationStatus.approved,
      },
    });
    await this.notifyOwner(
      post.employer.telegramId,
      `👤 E'loningizga (#${post.seq}) yangi ishchi qo'shildi: ${worker.fullName}.`,
    );
    await this.publisher.closeIfFull(postId);
    return this.detail(postId);
  }

  /** Bir nechta ishchini e'londan olib tashlaydi; joy ochilsa kanal yangilanadi. */
  async removeWorkers(postId: string, applicationIds: string[]) {
    if (!applicationIds.length) {
      throw new BadRequestException('Ishchilar tanlanmagan');
    }
    const post = await this.detail(postId);
    let removedApproved = 0;

    for (const applicationId of applicationIds) {
      const app = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { worker: true },
      });
      if (!app || app.jobPostId !== postId) continue;
      if (app.status === ApplicationStatus.cancelled) continue;

      const wasApproved = app.status === ApplicationStatus.approved;
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.cancelled },
      });
      if (wasApproved) removedApproved++;

      if (
        app.feeCharged &&
        app.feeCharged > 0 &&
        app.paymentMethod !== 'vip'
      ) {
        const newBalance = await this.balance.adjust(
          app.workerId,
          app.feeCharged,
          BalanceTransactionType.refund,
          { reason: 'removed from job', applicationId },
        );
        if (app.worker.telegramId) {
          await this.notify.notifyWorker(
            app.worker.telegramId,
            `↩️ Siz #${post.seq} e'londan olib tashlandingiz. Xizmat haqi qaytarildi. Joriy hisob: ${app.feeCharged} so'm qaytdi (balans: ${newBalance}).`,
          );
        }
      } else if (app.worker.telegramId) {
        await this.notify.notifyWorker(
          app.worker.telegramId,
          `↩️ Siz #${post.seq} e'londan olib tashlandingiz.`,
        );
      }
    }

    if (removedApproved > 0) {
      await this.notifyOwner(
        post.employer.telegramId,
        `👤 E'loningizdan (#${post.seq}) ${removedApproved} ta ishchi olib tashlandi.`,
      );
      await this.publisher.reopenAfterRemovals(postId, removedApproved);
    }

    return this.detail(postId);
  }

  /** Bitta ishchini olib tashlaydi (eski API). */
  async removeWorker(postId: string, applicationId: string) {
    return this.removeWorkers(postId, [applicationId]);
  }

  /**
   * Tasdiqlangan arizalar soni kerakli ishchilar soniga yetganda e'lonni yopadi,
   * kanal tugmasini olib tashlaydi va e'lon egasiga ishchilar ro'yxatini yuboradi.
   */
  private async closeIfFull(postId: string): Promise<void> {
    await this.publisher.closeIfFull(postId);
  }

  /** E'lonni bazadan va agar joylangan bo'lsa kanaldan ham o'chiradi. */
  async remove(id: string) {
    const post = await this.prisma.jobPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.channelMessageId) {
      await this.notify.deleteChannelMessage(post.channelMessageId);
    }
    await this.prisma.application.deleteMany({ where: { jobPostId: id } });
    await this.prisma.jobPost.delete({ where: { id } });
    return { deleted: true };
  }

  private async notifyOwner(telegramId: string | null, text: string) {
    if (telegramId) await this.notify.notifyEmployer(telegramId, text);
  }

  private toCreateData(
    dto: CreateJobPostDto,
    employerId: string,
    status: JobPostStatus,
  ): Prisma.JobPostUncheckedCreateInput {
    return {
      employerId,
      startDate: resolveStartDate(dto.startDay),
      startDay: dto.startDay,
      workersNeeded: dto.workersNeeded,
      salaryPerPerson: dto.salaryPerPerson,
      meal: mealMap[dto.meal] ?? JobMeal.NONE,
      startTime: dto.startTime,
      endTime: dto.endTime,
      address: dto.address,
      locationLat: dto.location?.lat ?? null,
      locationLng: dto.location?.lng ?? null,
      buses: dto.buses ?? null,
      description: dto.description,
      contactPhone: dto.contactPhone,
      status,
    };
  }
}
