import { Bot, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { createRedisClient } from '@soatbay/common';
import { prisma } from '@soatbay/database';
import { JobStartDay } from '@soatbay/shared-types';
import { MSG } from '@soatbay/common';
import { BotContext, initialSession, SessionData, Step } from './session';
import { mainMenuKeyboard } from './keyboards';
import { handleOnboardingText, handleStart } from './flows/onboarding';
import {
  beginFieldEdit,
  cancelToMenu,
  goBack,
  handleCreateText,
  handleLocationMessage,
  onConfirm,
  onMeal,
  onSkip,
  onWhen,
  saveEdit,
  showEditMenu,
  startCreatePost,
} from './flows/create-post';
import {
  askPostId,
  handleProfileText,
  showApplicants,
  showEditProfile,
  showInProgress,
  showMyPosts,
  startEditPost,
  startRepost,
} from './flows/menu';

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  const redis = createRedisClient();
  const storage = new RedisAdapter<SessionData>({ instance: redis });
  bot.use(
    session({
      initial: initialSession,
      storage,
    }),
  );

  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    const employer = await prisma.employer.findUnique({
      where: { telegramId: String(ctx.from.id) },
    });
    if (employer?.isBlocked) {
      await ctx.reply(MSG.blocked(employer.blockReason));
      return;
    }
    return next();
  });

  bot.command('start', handleStart);

  bot.callbackQuery('cp:when:today', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onWhen(ctx, JobStartDay.TODAY);
  });
  bot.callbackQuery('cp:when:tomorrow', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onWhen(ctx, JobStartDay.TOMORROW);
  });
  bot.callbackQuery('cp:meal:1', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onMeal(ctx, '1 mahal');
  });
  bot.callbackQuery('cp:meal:2', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onMeal(ctx, '2 mahal');
  });
  bot.callbackQuery('cp:meal:none', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onMeal(ctx, "yo'q");
  });
  bot.callbackQuery('cp:skip', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onSkip(ctx);
  });
  bot.callbackQuery('cp:back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await goBack(ctx);
  });
  bot.callbackQuery('cp:menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await cancelToMenu(ctx);
  });
  bot.callbackQuery('cp:confirm', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onConfirm(ctx);
  });
  bot.callbackQuery('cp:cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await cancelToMenu(ctx);
  });

  bot.callbackQuery(/^field:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await beginFieldEdit(ctx, ctx.match![1]);
  });
  bot.callbackQuery('edit:save', async (ctx) => {
    await ctx.answerCallbackQuery();
    await saveEdit(ctx);
  });

  bot.callbackQuery('repost:edit', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showEditMenu(ctx);
  });
  bot.callbackQuery('repost:publish', async (ctx) => {
    await ctx.answerCallbackQuery();
    await onConfirm(ctx);
  });
  bot.callbackQuery('profile:fio', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = Step.EDIT_PROFILE_FIO;
    await ctx.reply(MSG.askFullName);
  });
  bot.callbackQuery('profile:phone', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = Step.EDIT_PROFILE_PHONE;
    await ctx.reply(MSG.askPhone);
  });

  bot.callbackQuery(/^mp:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMyPosts(ctx, Number(ctx.match![1]));
  });
  bot.callbackQuery(/^ip:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showInProgress(ctx, Number(ctx.match![1]));
  });

  bot.on('message:location', async (ctx) => {
    if (await handleLocationMessage(ctx)) return;
  });

  bot.hears(MSG.employerMenu.createPost, startCreatePost);
  bot.hears(MSG.employerMenu.myPosts, (ctx) => showMyPosts(ctx));
  bot.hears(MSG.employerMenu.inProgress, (ctx) => showInProgress(ctx));
  bot.hears(MSG.employerMenu.editPost, (ctx) =>
    askPostId(ctx, Step.AWAIT_EDIT_ID),
  );
  bot.hears(MSG.employerMenu.applicants, (ctx) =>
    askPostId(ctx, Step.AWAIT_APPLICANTS_ID),
  );
  bot.hears(MSG.employerMenu.repost, (ctx) =>
    askPostId(ctx, Step.AWAIT_REPOST_ID),
  );
  bot.hears(MSG.employerMenu.editProfile, showEditProfile);

  bot.on('message:text', async (ctx) => {
    if (await handleOnboardingText(ctx)) return;
    if (await handleProfileText(ctx)) return;
    const step = ctx.session.step;
    const id = (ctx.message.text ?? '').trim().replace(/^#/, '');
    if (step === Step.AWAIT_APPLICANTS_ID) {
      await showApplicants(ctx, id);
      return;
    }
    if (step === Step.AWAIT_REPOST_ID) {
      await startRepost(ctx, id);
      return;
    }
    if (step === Step.AWAIT_EDIT_ID) {
      await startEditPost(ctx, id);
      return;
    }
    if (await handleCreateText(ctx)) return;
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
  });

  bot.catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[employer-bot] error', err);
  });

  return bot;
}
