import {
  ApplicationPaymentMethod,
  BalanceTransactionType,
  JobPost,
  prisma,
  Worker,
} from '@soatbay/database';
import {
  MSG,
  autoServiceFee,
  isVipActive,
  renderBalanceApplyCard,
  renderCardApplyCard,
  requiresDistanceScreenshot,
} from '@soatbay/common';
import { BotContext, Step } from '../session';
import { applyConfirmKeyboard, mainMenuKeyboard } from '../keyboards';
import { closeIfFull, getPostWithEmployer } from '../channel-post';
import {
  cancelUnpaidApplication,
  createApplication,
  createApplicationPaymentRequest,
  findWorkerByTelegramId,
  freeSlots,
  getPost,
  hasPendingOnDate,
  isBusyOnDate,
  isOwnJobPost,
} from '../repo';

const PAYMENT_WINDOW_MS = 3 * 60 * 1000;

async function replyAppliedSuccess(
  ctx: BotContext,
  postId: string,
): Promise<void> {
  const post = await getPostWithEmployer(postId);
  if (!post) {
    await ctx.reply('✅ Siz ishga muvaffaqiyatli yozildingiz.', {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }
  await ctx.reply(
    MSG.worker.appliedSuccess(post.employer.fullName, post.contactPhone),
    { reply_markup: mainMenuKeyboard() },
  );
}

async function proceedWithApplication(
  ctx: BotContext,
  worker: Worker,
  post: JobPost,
  postId: string,
  distanceScreenshotUrl: string | null,
): Promise<void> {
  const fee = post.serviceFee ?? autoServiceFee(post.salaryPerPerson);

  if (isVipActive(worker)) {
    const app = await createApplication(
      postId,
      worker.id,
      post.startDate,
      distanceScreenshotUrl,
    );
    await prisma.application.update({
      where: { id: app.id },
      data: { status: 'approved', paymentMethod: ApplicationPaymentMethod.vip },
    });
    ctx.session.step = Step.IDLE;
    ctx.session.applyPostId = undefined;
    await closeIfFull(postId);
    await replyAppliedSuccess(ctx, postId);
    return;
  }

  const application = await createApplication(
    postId,
    worker.id,
    post.startDate,
    distanceScreenshotUrl,
  );
  ctx.session.applicationId = application.id;

  if (worker.balance >= fee) {
    ctx.session.step = Step.IDLE;
    ctx.session.applyPostId = undefined;
    await ctx.reply(
      renderBalanceApplyCard({
        applicationId: application.id,
        salary: post.salaryPerPerson,
        fee,
        balance: worker.balance,
      }),
      { reply_markup: applyConfirmKeyboard() },
    );
    return;
  }

  const { getSettings } = await import('../settings');
  const settings = await getSettings();
  ctx.session.step = Step.APPLY_PAYMENT_CHECK;
  ctx.session.applyPostId = undefined;
  ctx.session.paymentDeadline = Date.now() + PAYMENT_WINDOW_MS;
  await ctx.reply(
    renderCardApplyCard({
      applicationId: application.id,
      salary: post.salaryPerPerson,
      fee,
      cardNumber: settings.cardNumber,
      cardHolder: settings.cardHolderName,
    }),
  );
  schedulePaymentTimeout(ctx, application.id);
}

/** Ishchi "Ishga yozilish" ni bosganda kirish nuqtasi (deep link apply_<id>). */
export async function beginApply(ctx: BotContext, postId: string): Promise<void> {
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return;
  const post = await getPost(postId);
  if (!post || post.status !== 'approved') {
    await ctx.reply(MSG.worker.noSlots, { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (await isOwnJobPost(worker, postId)) {
    await ctx.reply(MSG.cannotApplyOwnPost, { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (await isBusyOnDate(worker.id, post.startDate)) {
    await ctx.reply(MSG.worker.alreadyBusy, { reply_markup: mainMenuKeyboard() });
    return;
  }
  if (await hasPendingOnDate(worker.id, post.startDate)) {
    await ctx.reply(MSG.worker.alreadyPending, {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  const checking = await ctx.reply(MSG.worker.checkingSlots);
  const slots = await freeSlots(post);
  await ctx.api.deleteMessage(ctx.chat!.id, checking.message_id).catch(() => undefined);
  if (slots <= 0) {
    await ctx.reply(MSG.worker.noSlots, { reply_markup: mainMenuKeyboard() });
    return;
  }

  ctx.session.applyPostId = postId;
  await ctx.reply(MSG.worker.noShowWarning);

  if (!requiresDistanceScreenshot(post.startDate, post.startTime)) {
    await proceedWithApplication(ctx, worker, post, postId, null);
    return;
  }

  if (post.locationLat != null && post.locationLng != null) {
    await ctx.replyWithLocation(post.locationLat, post.locationLng);
  }
  ctx.session.step = Step.APPLY_DISTANCE;
  await ctx.reply(MSG.worker.askDistanceScreenshot);
}

export async function handleDistancePhoto(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.APPLY_DISTANCE) return false;
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) {
    await ctx.reply(MSG.worker.onlyPhoto);
    return true;
  }
  const fileId = photos[photos.length - 1].file_id;
  await ctx.reply(MSG.worker.screenshotAccepted);

  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  const postId = ctx.session.applyPostId!;
  const post = await getPost(postId);
  if (!worker || !post) {
    ctx.session.step = Step.IDLE;
    return true;
  }
  if (await isOwnJobPost(worker, postId)) {
    ctx.session.step = Step.IDLE;
    await ctx.reply(MSG.cannotApplyOwnPost, { reply_markup: mainMenuKeyboard() });
    return true;
  }

  await proceedWithApplication(ctx, worker, post, postId, fileId);
  return true;
}

function schedulePaymentTimeout(ctx: BotContext, applicationId: string): void {
  const chatId = ctx.chat?.id;
  if (chatId == null) return;
  setTimeout(() => {
    void (async () => {
      try {
        const cancelled = await cancelUnpaidApplication(applicationId);
        if (cancelled) {
          await ctx.api.sendMessage(chatId, MSG.worker.paymentExpired, {
            reply_markup: mainMenuKeyboard(),
          });
        }
      } catch {
        // ignore
      }
    })();
  }, PAYMENT_WINDOW_MS).unref?.();
}

export async function onApplyConfirm(ctx: BotContext): Promise<void> {
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  const applicationId = ctx.session.applicationId;
  if (!worker || !applicationId) return;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { jobPost: { include: { employer: true } } },
  });
  if (!application) return;

  if (await isOwnJobPost(worker, application.jobPostId)) {
    await ctx.reply(MSG.cannotApplyOwnPost, { reply_markup: mainMenuKeyboard() });
    return;
  }

  const post = application.jobPost;
  const fee = post.serviceFee ?? autoServiceFee(post.salaryPerPerson);

  if (worker.balance < fee) {
    await ctx.reply(MSG.worker.insufficientForVip(fee - worker.balance));
    return;
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.worker.update({
      where: { id: worker.id },
      data: { balance: { decrement: fee } },
    });
    await tx.balanceTransaction.create({
      data: {
        workerId: worker.id,
        amount: -fee,
        type: BalanceTransactionType.fee,
        balanceAfter: updated.balance,
        meta: { applicationId },
      },
    });
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'approved',
        paymentMethod: ApplicationPaymentMethod.balance,
        feeCharged: fee,
      },
    });
  });

  ctx.session.step = Step.IDLE;
  await closeIfFull(post.id);
  await replyAppliedSuccess(ctx, post.id);
}

export async function onApplyCancel(ctx: BotContext): Promise<void> {
  const applicationId = ctx.session.applicationId;
  if (applicationId) {
    await prisma.application
      .update({ where: { id: applicationId }, data: { status: 'cancelled' } })
      .catch(() => undefined);
  }
  ctx.session.step = Step.IDLE;
  ctx.session.applicationId = undefined;
  await ctx.reply('❌ Bekor qilindi.', { reply_markup: mainMenuKeyboard() });
}

export async function handlePaymentCheckPhoto(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.APPLY_PAYMENT_CHECK) return false;

  if (ctx.session.paymentDeadline && Date.now() > ctx.session.paymentDeadline) {
    const applicationId = ctx.session.applicationId;
    if (applicationId) await cancelUnpaidApplication(applicationId);
    ctx.session.step = Step.IDLE;
    ctx.session.paymentDeadline = undefined;
    ctx.session.applicationId = undefined;
    await ctx.reply(MSG.worker.paymentExpired, {
      reply_markup: mainMenuKeyboard(),
    });
    return true;
  }

  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) {
    await ctx.reply(MSG.worker.onlyPhoto);
    return true;
  }
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  const applicationId = ctx.session.applicationId;
  if (worker && applicationId) {
    await createApplicationPaymentRequest(
      worker.id,
      applicationId,
      photos[photos.length - 1].file_id,
    );
  }
  ctx.session.step = Step.IDLE;
  ctx.session.paymentDeadline = undefined;
  await ctx.reply(MSG.worker.paymentCheckAccepted, {
    reply_markup: mainMenuKeyboard(),
  });
  return true;
}
