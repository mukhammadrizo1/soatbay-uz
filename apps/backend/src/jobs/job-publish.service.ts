import { Injectable } from '@nestjs/common';
import { ApplicationStatus, JobPost, JobPostStatus } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { JobMeal } from '@soatbay/shared-types';
import { autoServiceFee, MSG, renderChannelPostCard, renderEmployerJobFullMessage } from '@soatbay/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotifyService } from '../notify/telegram-notify.service';

/** Prisma enum qiymatini o'qiladigan o'zbekcha ovqat yorlig'iga moslaydi. */
function mealLabel(meal: JobPost['meal']): JobMeal {
  switch (meal) {
    case 'ONCE':
      return JobMeal.ONCE;
    case 'TWICE':
      return JobMeal.TWICE;
    default:
      return JobMeal.NONE;
  }
}

@Injectable()
export class JobPublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TelegramNotifyService,
  ) {}

  /** Tasdiqlangan e'lonni kanalga joylaydi; lokatsiya alohida reply sifatida ketadi. */
  async publishToChannel(post: JobPost): Promise<number | null> {
    const approvedCount = await this.countApproved(post.id);
    const isInactive = post.status === JobPostStatus.inactive;
    const isClosed =
      post.status === JobPostStatus.closed ||
      approvedCount >= post.workersNeeded;
    const card = this.buildCard(post, isClosed, isInactive);
    const keyboard =
      isClosed || isInactive ? undefined : this.applyKeyboard(post.id);

    const messageId = await this.notify.publishToChannel(card, keyboard);
    if (messageId == null) return null;

    await this.prisma.jobPost.update({
      where: { id: post.id },
      data: {
        channelMessageId: messageId,
        ...(post.status === JobPostStatus.pending ||
        post.status === JobPostStatus.draft
          ? { status: JobPostStatus.approved }
          : {}),
      },
    });

    await this.sendLocationReply(post, messageId);
    return messageId;
  }

  /** E'lon to'lganda yoki yopilganda kanal xabarini yangilaydi (holat + tugma). */
  async refreshChannelPost(postId: string): Promise<void> {
    const post = await this.prisma.jobPost.findUnique({ where: { id: postId } });
    if (!post?.channelMessageId) return;

    const approvedCount = await this.countApproved(post.id);
    const isInactive = post.status === JobPostStatus.inactive;
    const isClosed =
      post.status === JobPostStatus.closed ||
      approvedCount >= post.workersNeeded;
    const card = this.buildCard(post, isClosed, isInactive);
    const keyboard =
      isClosed || isInactive ? undefined : this.applyKeyboard(post.id);

    await this.notify.editChannelMessage(
      post.channelMessageId,
      card,
      keyboard,
    );
  }

  /** Mavjud kanal xabarini joriy ma'lumotlar bo'yicha yangilaydi yoki yangi joylaydi. */
  async republishToChannel(postId: string): Promise<void> {
    const post = await this.prisma.jobPost.findUnique({ where: { id: postId } });
    if (!post) return;
    if (post.channelMessageId) {
      await this.refreshChannelPost(postId);
      return;
    }
    await this.publishToChannel(post);
  }

  /** Ishchi olib tashlanganda joy ochilsa e'lonni qayta ochadi va kanalni yangilaydi. */
  async reopenAfterRemovals(
    postId: string,
    removedApprovedCount: number,
  ): Promise<void> {
    if (removedApprovedCount <= 0) return;
    const post = await this.prisma.jobPost.findUnique({ where: { id: postId } });
    if (!post?.channelMessageId) return;

    const approvedCount = await this.countApproved(postId);
    if (approvedCount >= post.workersNeeded) return;

    if (post.status === JobPostStatus.closed) {
      await this.prisma.jobPost.update({
        where: { id: postId },
        data: { status: JobPostStatus.approved },
      });
    }

    await this.refreshChannelPost(postId);
    await this.notify.sendChannelTextReply(
      post.channelMessageId,
      MSG.channel.slotsOpened(removedApprovedCount),
    );
  }

  /** E'lon to'lganda yopiladi va kanal xabari yangilanadi. */
  async closeIfFull(postId: string): Promise<void> {
    const post = await this.prisma.jobPost.findUnique({
      where: { id: postId },
      include: {
        employer: true,
        applications: {
          where: { status: ApplicationStatus.approved },
          include: { worker: true },
        },
      },
    });
    if (!post || post.status !== JobPostStatus.approved) return;
    if (post.applications.length < post.workersNeeded) return;

    await this.prisma.jobPost.update({
      where: { id: postId },
      data: { status: JobPostStatus.closed },
    });
    await this.refreshChannelPost(postId);

    if (post.employer.telegramId) {
      await this.notify.notifyEmployer(
        post.employer.telegramId,
        renderEmployerJobFullMessage(
          post.seq,
          post.applications.map((a) => ({
            fullName: a.worker.fullName,
            phone: a.worker.phone,
          })),
        ),
      );
    }
  }

  private buildCard(post: JobPost, isClosed: boolean, isInactive = false): string {
    const fee =
      post.serviceFee != null && post.serviceFee >= 0
        ? post.serviceFee
        : autoServiceFee(post.salaryPerPerson);
    return renderChannelPostCard({
      seq: post.seq,
      startDay: post.startDay as 'today' | 'tomorrow',
      workersNeeded: post.workersNeeded,
      salaryPerPerson: post.salaryPerPerson,
      meal: mealLabel(post.meal),
      startTime: post.startTime,
      endTime: post.endTime,
      address: post.address,
      serviceFee: fee,
      description: post.description,
      buses: post.buses,
      isClosed,
      isInactive,
    });
  }

  private applyKeyboard(postId: string) {
    const botUsername =
      process.env.WORKER_BOT_USERNAME?.replace(/^@/, '') ??
      'Soatbay_worker_bot';
    return new InlineKeyboard().url(
      'Ishga yozilish',
      `https://t.me/${botUsername}?start=apply_${postId}`,
    );
  }

  private countApproved(postId: string) {
    return this.prisma.application.count({
      where: { jobPostId: postId, status: ApplicationStatus.approved },
    });
  }

  private async sendLocationReply(post: JobPost, messageId: number) {
    if (post.locationLat == null || post.locationLng == null) return;
    await this.notify.sendChannelVenueReply(
      messageId,
      post.locationLat,
      post.locationLng,
      post.address,
    );
  }
}
