import { MSG, isValidPhone, normalizePhone } from '@soatbay/common';
import { BotContext, Step } from '../session';
import { mainMenuKeyboard } from '../keyboards';
import {
  completeEmployerReregistration,
  createEmployer,
  findEmployerByTelegramId,
  isEmployerPhoneTaken,
} from '../repo';

/** /start kirish nuqtasi: salomlash yoki noma'lum bo'lsa ro'yxatdan o'tishni boshlash. */
export async function handleStart(ctx: BotContext): Promise<void> {
  const telegramId = String(ctx.from?.id);
  const employer = await findEmployerByTelegramId(telegramId);
  if (employer && !employer.needsReregistration) {
    ctx.session.step = Step.IDLE;
    ctx.session.reregister = undefined;
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
    return;
  }
  ctx.session.reregister = !!employer?.needsReregistration;
  ctx.session.step = Step.ONB_FULLNAME;
  await ctx.reply(
    employer?.needsReregistration ? MSG.reregisterPrompt : MSG.askFullName,
  );
}

/** Xabar ro'yxatdan o'tish oqimi tomonidan ishlangan bo'lsa true qaytaradi. */
export async function handleOnboardingText(ctx: BotContext): Promise<boolean> {
  const text = (ctx.message?.text ?? '').trim();
  const telegramId = String(ctx.from?.id);

  if (ctx.session.step === Step.ONB_FULLNAME) {
    if (text.length < 3) {
      await ctx.reply(MSG.invalidFullName);
      return true;
    }
    ctx.session.fullName = text;
    ctx.session.step = Step.ONB_PHONE;
    await ctx.reply(MSG.askPhone);
    return true;
  }

  if (ctx.session.step === Step.ONB_PHONE) {
    if (!isValidPhone(text)) {
      await ctx.reply(MSG.invalidPhone);
      return true;
    }
    const phone = normalizePhone(text)!;
    const existing = await findEmployerByTelegramId(telegramId);

    if (ctx.session.reregister && existing) {
      if (await isEmployerPhoneTaken(phone, existing.id)) {
        await ctx.reply(MSG.phoneExistsEmployer);
        return true;
      }
      await completeEmployerReregistration(
        telegramId,
        ctx.session.fullName ?? '',
        phone,
      );
    } else {
      if (await isEmployerPhoneTaken(phone)) {
        await ctx.reply(MSG.phoneExistsEmployer);
        return true;
      }
      await createEmployer(telegramId, ctx.session.fullName ?? '', phone);
    }

    ctx.session.step = Step.IDLE;
    ctx.session.reregister = undefined;
    await ctx.reply('✅ Ro\'yxatdan o\'tdingiz!', {
      reply_markup: mainMenuKeyboard(),
    });
    return true;
  }

  return false;
}
