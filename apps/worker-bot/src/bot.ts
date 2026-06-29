import { Bot, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { createRedisClient } from '@soatbay/common';
import { prisma } from '@soatbay/database';
import { MSG } from '@soatbay/common';
import { BotContext, initialSession, SessionData, Step } from './session';
import { mainMenuKeyboard } from './keyboards';
import {
  handlePassportPhoto,
  handleRegistrationText,
  handleStart,
  onOfferAccept,
  onOfferReject,
  onOfferRestart,
  onRegConfirm,
  onRegReenter,
} from './flows/onboarding';
import { handleUnexpectedInput } from './flows/guard';
import {
  handleDistancePhoto,
  handlePaymentCheckPhoto,
  onApplyCancel,
  onApplyConfirm,
} from './flows/apply';
import {
  handleChangePhone,
  handleComplaint,
  handleTopupPhoto,
  onBuyVip,
  onBuyVipPrompt,
  onChangePhonePrompt,
  onComplaintPrompt,
  onTopup,
  showMyApplications,
  showMyInfo,
  showSupport,
} from './flows/menu';

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  const redis = createRedisClient();
  const storage = new RedisAdapter<SessionData>({ instance: redis });
  bot.use(session({ initial: initialSession, storage }));

  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    const worker = await prisma.worker.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });
    if (worker?.isBlocked) {
      await ctx.reply(MSG.blocked(worker.blockReason));
      return;
    }
    return next();
  });

  bot.command('start', handleStart);

  bot.callbackQuery('offer:accept', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onOfferAccept(ctx);
  });
  bot.callbackQuery('offer:reject', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onOfferReject(ctx);
  });
  bot.callbackQuery('offer:restart', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onOfferRestart(ctx);
  });

  bot.callbackQuery('reg:confirm', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onRegConfirm(ctx);
  });
  bot.callbackQuery('reg:reenter', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onRegReenter(ctx);
  });

  bot.callbackQuery('apply:confirm', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onApplyConfirm(ctx);
  });
  bot.callbackQuery('apply:cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onApplyCancel(ctx);
  });

  bot.callbackQuery('info:topup', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onTopup(ctx);
  });
  bot.callbackQuery('info:vip', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onBuyVipPrompt(ctx);
  });
  bot.callbackQuery('info:phone', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onChangePhonePrompt(ctx);
  });
  bot.callbackQuery('info:menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = Step.IDLE;
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
  });
  bot.callbackQuery('vip:buy', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onBuyVip(ctx);
  });

  bot.hears(MSG.worker.menu.myApplications, showMyApplications);
  bot.hears(MSG.worker.menu.myInfo, showMyInfo);
  bot.hears(MSG.worker.menu.support, showSupport);
  bot.hears(MSG.worker.menu.complaint, onComplaintPrompt);

  bot.on('message:photo', async (ctx) => {
    if (await handlePassportPhoto(ctx)) return;
    if (await handleDistancePhoto(ctx)) return;
    if (await handlePaymentCheckPhoto(ctx)) return;
    if (await handleTopupPhoto(ctx)) return;
    if (await handleComplaint(ctx)) return;
    if (await handleUnexpectedInput(ctx)) return;
  });

  bot.on('message:document', async (ctx) => {
    if (await handleUnexpectedInput(ctx)) return;
    if (await handleComplaint(ctx)) return;
  });

  bot.on('message:text', async (ctx) => {
    if (await handleRegistrationText(ctx)) return;
    if (await handleChangePhone(ctx)) return;
    if (await handleComplaint(ctx)) return;
    if (await handleUnexpectedInput(ctx)) return;
    if (ctx.session.step !== Step.IDLE) return;
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
  });

  bot.catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[worker-bot] error', err);
  });

  return bot;
}
