import { Api, InlineKeyboard } from 'grammy';
import { JobPostStatus, prisma } from '@soatbay/database';
import { JobMeal } from '@soatbay/shared-types';
import { autoServiceFee, renderChannelPostCard } from '@soatbay/common';

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

/** VIP mijoz e'lonini to'g'ridan-to'g'ri kanalga joylaydi. */
export async function publishPostToChannel(postId: string): Promise<boolean> {
  const post = await prisma.jobPost.findUnique({ where: { id: postId } });
  const channelId = process.env.CHANNEL_ID;
  const api = channelApi();
  if (!post || !channelId || !api) return false;

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
    isClosed: false,
    isInactive: false,
  });

  const botUsername =
    process.env.WORKER_BOT_USERNAME?.replace(/^@/, '') ?? 'Soatbay_worker_bot';
  const markup = new InlineKeyboard().url(
    'Ishga yozilish',
    `https://t.me/${botUsername}?start=apply_${post.id}`,
  );

  const msg = await api
    .sendMessage(channelId, card, { reply_markup: markup })
    .catch(() => null);
  if (!msg) return false;

  await prisma.jobPost.update({
    where: { id: postId },
    data: { channelMessageId: msg.message_id, status: JobPostStatus.approved },
  });

  if (post.locationLat != null && post.locationLng != null) {
    await api
      .sendVenue(
        channelId,
        post.locationLat,
        post.locationLng,
        post.address.slice(0, 64),
        post.address,
        { reply_to_message_id: msg.message_id },
      )
      .catch(() => undefined);
  }

  return true;
}
