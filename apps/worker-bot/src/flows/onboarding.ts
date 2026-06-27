import {
  MSG,
  isValidAge,
  isValidPhone,
  isVipActive,
  normalizePhone,
  parsePositiveInt,
  renderWorkerInfoCard,
} from '@soatbay/common';
import { BotContext, Step } from '../session';
import {
  mainMenuKeyboard,
  offerKeyboard,
  offerRestartKeyboard,
  regConfirmKeyboard,
} from '../keyboards';
import { OFFER_TEXT } from '../offer';
import {
  findWorkerByPhone,
  findWorkerByTelegramId,
  markOfferAccepted,
  submitRegistration,
  upsertWorker,
} from '../repo';

/** /start: deep-link yozilish payloadi, oferta yoki salomlashni ishlaydi. */
export async function handleStart(ctx: BotContext): Promise<void> {
  const telegramId = String(ctx.from?.id);
  const payload = ctx.match?.toString() ?? '';
  const worker = await findWorkerByTelegramId(telegramId);

  if (!worker || !worker.offerAccepted) {
    ctx.session.step = Step.OFFER;
    if (payload.startsWith('apply_')) {
      ctx.session.applyPostId = payload.replace('apply_', '');
    }
    await ctx.reply(OFFER_TEXT, { reply_markup: offerKeyboard() });
    return;
  }

  if (payload.startsWith('apply_')) {
    ctx.session.applyPostId = payload.replace('apply_', '');
    const { beginApply } = await import('./apply');
    await beginApply(ctx, ctx.session.applyPostId);
    return;
  }

  ctx.session.step = Step.IDLE;
  await ctx.reply(MSG.worker.justRegistered, {
    reply_markup: mainMenuKeyboard(),
  });
}

export async function onOfferAccept(ctx: BotContext): Promise<void> {
  ctx.session.reg = {};
  ctx.session.step = Step.REG_FULLNAME;
  await ctx.reply(MSG.askFullName);
}

export async function onOfferReject(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.IDLE;
  await ctx.reply(MSG.worker.offerRejected, {
    reply_markup: offerRestartKeyboard(),
  });
}

export async function onOfferRestart(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.OFFER;
  await ctx.reply(OFFER_TEXT, { reply_markup: offerKeyboard() });
}

export async function handleRegistrationText(
  ctx: BotContext,
): Promise<boolean> {
  const text = (ctx.message?.text ?? '').trim();
  const reg = ctx.session.reg;

  if (ctx.session.step === Step.REG_FULLNAME) {
    if (text.length < 3) {
      await ctx.reply(MSG.invalidFullName);
      return true;
    }
    reg.fullName = text;
    ctx.session.step = Step.REG_PHONE;
    await ctx.reply(MSG.askPhone);
    return true;
  }

  if (ctx.session.step === Step.REG_PHONE) {
    if (!isValidPhone(text)) {
      await ctx.reply(MSG.invalidPhone);
      return true;
    }
    const phone = normalizePhone(text)!;
    const existing = await findWorkerByPhone(phone);
    if (existing && existing.telegramId !== String(ctx.from?.id)) {
      await ctx.reply(MSG.phoneTaken);
      return true;
    }
    reg.phone = phone;
    ctx.session.step = Step.REG_AGE;
    await ctx.reply(MSG.worker.askAge);
    return true;
  }

  if (ctx.session.step === Step.REG_AGE) {
    const age = parsePositiveInt(text);
    if (age === null || !isValidAge(age)) {
      await ctx.reply(MSG.worker.invalidAge);
      return true;
    }
    reg.age = age;
    ctx.session.step = Step.REG_PASSPORT;
    await ctx.reply(MSG.worker.askPassport);
    return true;
  }

  return false;
}

export async function handlePassportPhoto(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.REG_PASSPORT) return false;
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) {
    await ctx.reply(MSG.worker.invalidPassport);
    return true;
  }
  ctx.session.reg.passportPhotoFileId = photos[photos.length - 1].file_id;
  ctx.session.step = Step.REG_CONFIRM;
  const reg = ctx.session.reg;
  await ctx.reply(
    renderWorkerInfoCard({
      fullName: reg.fullName ?? '',
      phone: reg.phone ?? '',
      age: reg.age ?? 0,
      passportSent: true,
    }),
    { reply_markup: regConfirmKeyboard() },
  );
  return true;
}

export async function onRegConfirm(ctx: BotContext): Promise<void> {
  const reg = ctx.session.reg;
  const telegramId = String(ctx.from?.id);
  const worker = await upsertWorker(telegramId, {
    fullName: reg.fullName ?? '',
    phone: reg.phone ?? '',
    age: reg.age ?? 0,
    passportPhotoUrl: reg.passportPhotoFileId ?? '',
  });
  await markOfferAccepted(telegramId).catch(() => undefined);
  await submitRegistration(worker.id);
  ctx.session.step = Step.IDLE;
  await ctx.reply(MSG.worker.registrationSentToAdmin, {
    reply_markup: mainMenuKeyboard(),
  });

  if (ctx.session.applyPostId) {
    const { beginApply } = await import('./apply');
    await beginApply(ctx, ctx.session.applyPostId);
  }
}

export async function onRegReenter(ctx: BotContext): Promise<void> {
  ctx.session.reg = {};
  ctx.session.step = Step.REG_FULLNAME;
  await ctx.reply(MSG.askFullName);
}
