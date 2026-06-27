import { Api, InlineKeyboard } from 'grammy';
import { ApplicationStatus, JobPostStatus, prisma } from '@soatbay/database';
import { JobMeal } from '@soatbay/shared-types';
import {
  autoServiceFee,
  renderChannelPostCard,
  renderEmployerJobFullMessage,
} from '@soatbay/common';

function mealLabel(meal: string): JobMeal {
  if (meal === 'ONCE') return JobMeal.ONCE;
  if (meal === 'TWICE') return JobMeal.TWICE;
  return JobMeal.NONE;
}

function channelApi(): Api | null {
  const token = process.env.WORKER_BOT_TOKEN;
  if (!token || token.startsWith('000000000')) return null;
  return new Api(token);
}

function employerApi(): Api | null {
  const token = process.env.EMPLOYER_BOT_TOKEN;
  if (!token || token.startsWith('000000000')) return null;
  return new Api(token);
}

async function refreshChannelPost(postId: string): Promise<void> {
  const post = await prisma.jobPost.findUnique({ where: { id: postId } });
  const channelId = process.env.CHANNEL_ID;
  const api = channelApi();
  if (!post?.channelMessageId || !channelId || !api) return;

  const approvedCount = await prisma.application.count({
    where: { jobPostId: postId, status: ApplicationStatus.approved },
  });
  const isInactive = post.status === JobPostStatus.inactive;
  const isClosed =
    post.status === JobPostStatus.closed ||
    approvedCount >= post.workersNeeded;
  const fee =
    post.serviceFee != null && post.serviceFee >= 0
      ? post.serviceFee
      : autoServiceFee(post.salaryPerPerson);
  const card = renderChannelPostCard({
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

  const botUsername =
    process.env.WORKER_BOT_USERNAME?.replace(/^@/, '') ?? 'Soatbay_worker_bot';
  const markup =
    isClosed || isInactive
      ? { inline_keyboard: [] }
      : new InlineKeyboard().url(
          'Ishga yozilish',
          `https://t.me/${botUsername}?start=apply_${post.id}`,
        );

  await api
    .editMessageText(channelId, post.channelMessageId, card, {
      reply_markup: markup,
    })
    .catch(() => undefined);
}

/** Ishchilar to'lganda e'lonni yopadi, kanal xabarini yangilaydi va ish beruvchiga ro'yxat yuboradi. */
export async function closeIfFull(postId: string): Promise<void> {
  const post = await prisma.jobPost.findUnique({
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

  await prisma.jobPost.update({
    where: { id: postId },
    data: { status: JobPostStatus.closed },
  });
  await refreshChannelPost(postId);

  if (post.employer.telegramId) {
    const api = employerApi();
    const text = renderEmployerJobFullMessage(
      post.seq,
      post.applications.map((a) => ({
        fullName: a.worker.fullName,
        phone: a.worker.phone,
      })),
    );
    if (api) {
      await api
        .sendMessage(post.employer.telegramId, text)
        .catch(() => undefined);
    }
  }
}

export async function getPostWithEmployer(postId: string) {
  return prisma.jobPost.findUnique({
    where: { id: postId },
    include: { employer: true },
  });
}
