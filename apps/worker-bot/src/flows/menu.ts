import {
  BalanceTransactionType,
  prisma,
  RequestStatus,
} from '@soatbay/database';
import {
  MSG,
  formatSom,
  isValidPhone,
  isVipActive,
  normalizePhone,
  parseAmount,
  renderTopupCard,
  renderWorkerProfileCard,
  startDayLabel,
  statusLabel,
} from '@soatbay/common';
import { BotContext, Step } from '../session';
import {
  buyVipKeyboard,
  cancelToMenuKeyboard,
  infoMenuKeyboard,
  mainMenuKeyboard,
} from '../keyboards';
import { getSettings } from '../settings';
import {
  createComplaint,
  createDepositRequest,
  findWorkerByPhone,
  findWorkerByTelegramId,
  listMyApplications,
  updatePhone,
} from '../repo';

export async function showMyApplications(ctx: BotContext): Promise<void> {
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return;
  const apps = await listMyApplications(worker.id);
  if (apps.length === 0) {
    await ctx.reply('Sizda hali ish arizalari yo\'q.');
    return;
  }
  const body = apps
    .map(
      (a) =>
        `#${a.seq}\n📅 ${startDayLabel(a.jobPost.startDay as 'today' | 'tomorrow')} | 💸 ${formatSom(a.jobPost.salaryPerPerson)} | ${statusLabel(a.status)}`,
    )
    .join('\n\n');
  await ctx.reply(`${MSG.worker.myApplicationsHeader}${body}`);
}

export async function showMyInfo(ctx: BotContext): Promise<void> {
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return;
  await ctx.reply(
    renderWorkerProfileCard({
      fullName: worker.fullName,
      phone: worker.phone,
      age: worker.age,
      hasPassport: !!worker.passportPhotoUrl,
      isVip: isVipActive(worker),
      balance: worker.balance,
    }),
    { reply_markup: infoMenuKeyboard() },
  );
}

export async function onTopup(ctx: BotContext): Promise<void> {
  const settings = await getSettings();
  ctx.session.step = Step.TOPUP_CHECK;
  await ctx.reply(
    renderTopupCard({
      cardNumber: settings.cardNumber,
      cardHolder: settings.cardHolderName,
      minAmount: settings.minTopupAmount,
    }),
    { reply_markup: cancelToMenuKeyboard() },
  );
}

export async function handleTopupPhoto(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.TOPUP_CHECK) return false;
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) {
    await ctx.reply(MSG.worker.onlyPhoto);
    return true;
  }
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return true;
  const settings = await getSettings();
  const caption = ctx.message?.caption ?? '';
  const amount = parseAmount(caption) ?? settings.minTopupAmount;
  await createDepositRequest(
    worker.id,
    amount,
    photos[photos.length - 1].file_id,
  );
  ctx.session.step = Step.IDLE;
  await ctx.reply(MSG.worker.topupAccepted, { reply_markup: mainMenuKeyboard() });
  return true;
}

export async function onBuyVipPrompt(ctx: BotContext): Promise<void> {
  const settings = await getSettings();
  await ctx.reply(MSG.worker.vipInfo(settings.vipPrice), {
    reply_markup: buyVipKeyboard(),
  });
}

export async function onBuyVip(ctx: BotContext): Promise<void> {
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return;
  const settings = await getSettings();
  if (worker.balance < settings.vipPrice) {
    const need = settings.vipPrice - worker.balance;
    await ctx.reply(MSG.worker.insufficientForVip(need));
    return;
  }
  const expires = new Date(
    Date.now() + settings.vipDurationDays * 24 * 60 * 60 * 1000,
  );
  await prisma.$transaction(async (tx) => {
    const updated = await tx.worker.update({
      where: { id: worker.id },
      data: {
        balance: { decrement: settings.vipPrice },
        isVip: true,
        vipExpiresAt: expires,
      },
    });
    await tx.balanceTransaction.create({
      data: {
        workerId: worker.id,
        amount: -settings.vipPrice,
        type: BalanceTransactionType.vip,
        balanceAfter: updated.balance,
      },
    });
    await tx.vipPurchase.create({
      data: {
        workerId: worker.id,
        amount: settings.vipPrice,
        status: RequestStatus.approved,
      },
    });
  });
  await ctx.reply(
    `🌟 Tabriklaymiz! VIP tarifi yoqildi. Amal qilish muddati: ${settings.vipDurationDays} kun.`,
    { reply_markup: mainMenuKeyboard() },
  );
}

export async function onChangePhonePrompt(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.CHANGE_PHONE;
  await ctx.reply(MSG.askPhone, { reply_markup: cancelToMenuKeyboard() });
}

export async function handleChangePhone(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.CHANGE_PHONE) return false;
  const text = (ctx.message?.text ?? '').trim();
  if (!isValidPhone(text)) {
    await ctx.reply(MSG.invalidPhone);
    return true;
  }
  const phone = normalizePhone(text)!;
  const existing = await findWorkerByPhone(phone);
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return true;
  if (existing && existing.id !== worker.id) {
    await ctx.reply(MSG.phoneTaken);
    return true;
  }
  await updatePhone(worker.id, phone);
  ctx.session.step = Step.IDLE;
  await ctx.reply(MSG.profileUpdated, { reply_markup: mainMenuKeyboard() });
  return true;
}

export async function showSupport(ctx: BotContext): Promise<void> {
  await ctx.reply(MSG.worker.support);
}

export async function onComplaintPrompt(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.COMPLAINT;
  await ctx.reply(MSG.worker.complaintPrompt, {
    reply_markup: cancelToMenuKeyboard(),
  });
}

export async function handleComplaint(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.COMPLAINT) return false;
  const worker = await findWorkerByTelegramId(String(ctx.from?.id));
  if (!worker) return true;
  const text = ctx.message?.text ?? ctx.message?.caption ?? null;
  const attachments: unknown[] = [];
  if (ctx.message?.photo?.length) {
    attachments.push({
      type: 'photo',
      fileId: ctx.message.photo[ctx.message.photo.length - 1].file_id,
    });
  }
  if (ctx.message?.document) {
    attachments.push({
      type: 'document',
      fileId: ctx.message.document.file_id,
    });
  }
  const complaint = await createComplaint(worker.id, text, attachments);
  ctx.session.step = Step.IDLE;
  await ctx.reply(
    `${MSG.worker.complaintSent}\nShikoyat raqami: #${complaint.seq}`,
    { reply_markup: mainMenuKeyboard() },
  );
  return true;
}
