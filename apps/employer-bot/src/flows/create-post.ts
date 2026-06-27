import { JobMeal, JobStartDay } from '@soatbay/shared-types';
import {
  MSG,
  isStartTimeValid,
  isVipActive,
  parseAmount,
  parseCoordinates,
  parsePositiveInt,
  parseTime,
  isValidPhone,
  normalizePhone,
  renderPostCard,
} from '@soatbay/common';
import { BotContext, CREATE_STEP_ORDER, PostDraft, Step } from '../session';
import {
  confirmKeyboard,
  editFieldsKeyboard,
  mainMenuKeyboard,
  mealKeyboard,
  skipKeyboard,
  stepControls,
  whenKeyboard,
} from '../keyboards';
import {
  findEmployerByTelegramId,
  submitPost,
  updatePostFromDraft,
} from '../repo';

/** Har bir maydon tahrirlash callback tokenini mos FSM qadamiga moslaydi. */
const FIELD_STEP: Record<string, Step> = {
  when: Step.CP_WHEN,
  workers: Step.CP_WORKERS,
  salary: Step.CP_SALARY,
  meal: Step.CP_MEAL,
  starttime: Step.CP_START_TIME,
  endtime: Step.CP_END_TIME,
  address: Step.CP_ADDRESS,
  location: Step.CP_LOCATION,
  buses: Step.CP_BUSES,
  description: Step.CP_DESCRIPTION,
  contact: Step.CP_CONTACT_PHONE,
};

const STEP_FIELD: Partial<Record<Step, keyof PostDraft>> = {
  [Step.CP_WHEN]: 'startDay',
  [Step.CP_WORKERS]: 'workersNeeded',
  [Step.CP_SALARY]: 'salaryPerPerson',
  [Step.CP_MEAL]: 'meal',
  [Step.CP_START_TIME]: 'startTime',
  [Step.CP_END_TIME]: 'endTime',
  [Step.CP_ADDRESS]: 'address',
  [Step.CP_LOCATION]: 'location',
  [Step.CP_BUSES]: 'buses',
  [Step.CP_DESCRIPTION]: 'description',
  [Step.CP_CONTACT_PHONE]: 'contactPhone',
};

/** Joriy qadamga mos so'rovni yuboradi. */
export async function promptStep(ctx: BotContext, step: Step): Promise<void> {
  ctx.session.step = step;
  switch (step) {
    case Step.CP_WHEN:
      await ctx.reply(MSG.create.when, { reply_markup: whenKeyboard() });
      return;
    case Step.CP_WORKERS:
      await ctx.reply(MSG.create.workersNeeded, { reply_markup: stepControls() });
      return;
    case Step.CP_SALARY:
      await ctx.reply(MSG.create.salary, { reply_markup: stepControls() });
      return;
    case Step.CP_MEAL:
      await ctx.reply(MSG.create.meal, { reply_markup: mealKeyboard() });
      return;
    case Step.CP_START_TIME:
      await ctx.reply(MSG.create.startTime, { reply_markup: stepControls() });
      return;
    case Step.CP_END_TIME:
      await ctx.reply(MSG.create.endTime, { reply_markup: skipKeyboard() });
      return;
    case Step.CP_ADDRESS:
      await ctx.reply(MSG.create.address, { reply_markup: stepControls() });
      return;
    case Step.CP_LOCATION:
      await ctx.reply(MSG.create.location, { reply_markup: stepControls() });
      return;
    case Step.CP_BUSES:
      await ctx.reply(MSG.create.buses, { reply_markup: skipKeyboard() });
      return;
    case Step.CP_DESCRIPTION:
      await ctx.reply(MSG.create.description, { reply_markup: stepControls() });
      return;
    case Step.CP_CONTACT_PHONE:
      await ctx.reply(MSG.create.contactPhone, { reply_markup: stepControls() });
      return;
    case Step.CP_CONFIRM:
      await showSummary(ctx);
      return;
    default:
      return;
  }
}

async function showSummary(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.CP_CONFIRM;
  const d = ctx.session.draft;
  const card = renderPostCard({
    startDay: d.startDay === 'tomorrow' ? 'tomorrow' : 'today',
    workersNeeded: d.workersNeeded ?? 0,
    salaryPerPerson: d.salaryPerPerson ?? 0,
    meal: (d.meal as JobMeal) ?? null,
    startTime: d.startTime ?? '',
    endTime: d.endTime ?? null,
    address: d.address ?? '',
    location: d.location ?? null,
    buses: d.buses,
    description: d.description ?? '',
    contactPhone: d.contactPhone ?? '',
  });
  await ctx.reply(`${card}\n\n${MSG.employer.fakeDataWarningShort}`, {
    reply_markup: confirmKeyboard(),
  });
}

export async function startCreatePost(ctx: BotContext): Promise<void> {
  ctx.session.mode = 'create';
  ctx.session.editingPostId = undefined;
  ctx.session.repostSourceId = undefined;
  ctx.session.editField = undefined;
  ctx.session.draft = {};
  await ctx.reply(MSG.employer.fakeDataWarning);
  return promptStep(ctx, Step.CP_WHEN);
}

/** Joriy qoralamani + har maydon tahrirlash menyusini ko'rsatadi (tahrirlash / qayta e'lon rejimlari). */
export async function showEditMenu(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.IDLE;
  ctx.session.editField = undefined;
  const d = ctx.session.draft;
  const mode = ctx.session.mode === 'repost' ? 'repost' : 'edit';
  const card = renderPostCard({
    startDay: d.startDay === 'tomorrow' ? 'tomorrow' : 'today',
    workersNeeded: d.workersNeeded ?? 0,
    salaryPerPerson: d.salaryPerPerson ?? 0,
    meal: (d.meal as JobMeal) ?? null,
    startTime: d.startTime ?? '',
    endTime: d.endTime ?? null,
    address: d.address ?? '',
    location: d.location ?? null,
    buses: d.buses,
    description: d.description ?? '',
    contactPhone: d.contactPhone ?? '',
  });
  await ctx.reply(`${card}\n\n${MSG.editFieldsTitle}`, {
    reply_markup: editFieldsKeyboard(mode),
  });
}

/** Bitta maydonni tahrirlashni boshlaydi; kiritilgach tahrirlash menyusiga qaytadi. */
export async function beginFieldEdit(
  ctx: BotContext,
  fieldToken: string,
): Promise<void> {
  const step = FIELD_STEP[fieldToken];
  if (!step) return;
  ctx.session.editField = STEP_FIELD[step];
  await promptStep(ctx, step);
}

/** Mavjud jarayondagi e'lon tahrirlarini bazaga saqlaydi (tahrirlash rejimi). */
export async function saveEdit(ctx: BotContext): Promise<void> {
  const postId = ctx.session.editingPostId;
  if (!postId) {
    await cancelToMenu(ctx);
    return;
  }
  await updatePostFromDraft(postId, ctx.session.draft);
  ctx.session.step = Step.IDLE;
  ctx.session.mode = undefined;
  ctx.session.editingPostId = undefined;
  ctx.session.draft = {};
  await ctx.reply(MSG.editSaved, { reply_markup: mainMenuKeyboard() });
}

/** Yaratish oqimida bir qadam orqaga qaytadi, avvalgi qadamni qayta so'raydi. */
export async function goBack(ctx: BotContext): Promise<void> {
  // Bitta maydon tahrirlash paytida, Orqaga aksincha tahrirlash menyusiga qaytaradi.
  if (
    ctx.session.editField &&
    (ctx.session.mode === 'edit' || ctx.session.mode === 'repost')
  ) {
    await showEditMenu(ctx);
    return;
  }
  const idx = CREATE_STEP_ORDER.indexOf(ctx.session.step);
  if (idx <= 0) {
    await promptStep(ctx, Step.CP_WHEN);
    return;
  }
  await promptStep(ctx, CREATE_STEP_ORDER[idx - 1]);
}

export async function cancelToMenu(ctx: BotContext): Promise<void> {
  ctx.session.step = Step.IDLE;
  ctx.session.mode = undefined;
  ctx.session.editingPostId = undefined;
  ctx.session.repostSourceId = undefined;
  ctx.session.editField = undefined;
  ctx.session.draft = {};
  await ctx.reply(MSG.postCancelled, { reply_markup: mainMenuKeyboard() });
}

/** E'lon yaratish qadami ichidagi matn kiritishni ishlaydi. Ishlangan bo'lsa true. */
export async function handleCreateText(ctx: BotContext): Promise<boolean> {
  const text = (ctx.message?.text ?? '').trim();
  const d = ctx.session.draft;

  switch (ctx.session.step) {
    case Step.CP_WORKERS: {
      const n = parsePositiveInt(text);
      if (n === null) {
        await ctx.reply(MSG.errNotInteger, { reply_markup: stepControls() });
        return true;
      }
      d.workersNeeded = n;
      await advance(ctx, Step.CP_SALARY);
      return true;
    }
    case Step.CP_SALARY: {
      const amount = parseAmount(text);
      if (amount === null) {
        await ctx.reply(MSG.errInvalidAmount, { reply_markup: stepControls() });
        return true;
      }
      d.salaryPerPerson = amount;
      await advance(ctx, Step.CP_MEAL);
      return true;
    }
    case Step.CP_START_TIME: {
      const time = parseTime(text);
      if (!time) {
        await ctx.reply(MSG.errInvalidTime, { reply_markup: stepControls() });
        return true;
      }
      const day = d.startDay === 'tomorrow' ? 'tomorrow' : 'today';
      if (!isStartTimeValid(time, day)) {
        await ctx.reply(MSG.errStartTimeTooSoon, {
          reply_markup: stepControls(),
        });
        return true;
      }
      d.startTime = time;
      await advance(ctx, Step.CP_END_TIME);
      return true;
    }
    case Step.CP_END_TIME: {
      const time = parseTime(text);
      if (!time) {
        await ctx.reply(MSG.errInvalidTime, { reply_markup: skipKeyboard() });
        return true;
      }
      d.endTime = time;
      await advance(ctx, Step.CP_ADDRESS);
      return true;
    }
    case Step.CP_ADDRESS: {
      if (!text) {
        await ctx.reply(MSG.create.address, { reply_markup: stepControls() });
        return true;
      }
      d.address = text;
      await advance(ctx, Step.CP_LOCATION);
      return true;
    }
    case Step.CP_LOCATION: {
      // Telegram lokatsiyasi alohida ishlanadi; bu yerda koordinata matnini o'qiymiz.
      const coords = parseCoordinates(text);
      if (!coords) {
        await ctx.reply(MSG.errInvalidLocation, {
          reply_markup: stepControls(),
        });
        return true;
      }
      d.location = coords;
      await advance(ctx, Step.CP_BUSES);
      return true;
    }
    case Step.CP_BUSES: {
      d.buses = text || null;
      await advance(ctx, Step.CP_DESCRIPTION);
      return true;
    }
    case Step.CP_DESCRIPTION: {
      if (!text) {
        await ctx.reply(MSG.create.description, { reply_markup: stepControls() });
        return true;
      }
      d.description = text;
      await advance(ctx, Step.CP_CONTACT_PHONE);
      return true;
    }
    case Step.CP_CONTACT_PHONE: {
      if (!isValidPhone(text)) {
        await ctx.reply(MSG.invalidPhone, { reply_markup: stepControls() });
        return true;
      }
      d.contactPhone = normalizePhone(text)!;
      await advance(ctx, Step.CP_CONFIRM);
      return true;
    }
    default:
      return false;
  }
}

/** CP_LOCATION davomida forward qilingan Telegram lokatsiya xabarini ishlaydi. */
export async function handleLocationMessage(ctx: BotContext): Promise<boolean> {
  if (ctx.session.step !== Step.CP_LOCATION) return false;
  const loc = ctx.message?.location;
  if (!loc) return false;
  ctx.session.draft.location = { lat: loc.latitude, lng: loc.longitude };
  await advance(ctx, Step.CP_BUSES);
  return true;
}

async function advance(ctx: BotContext, next: Step): Promise<void> {
  // Bitta maydon tahrirlanayotganda (tahrirlash / qayta e'lon menyulari) tahrirlash menyusiga qaytadi.
  if (ctx.session.editField) {
    if (ctx.session.mode === 'edit' || ctx.session.mode === 'repost') {
      await showEditMenu(ctx);
      return;
    }
    // Yaratish xulosasidan maydonni tahrirlash -> xulosaga qaytish.
    ctx.session.editField = undefined;
    await promptStep(ctx, Step.CP_CONFIRM);
    return;
  }
  await promptStep(ctx, next);
}

// ── Callback ishlovchilari ──
export async function onWhen(
  ctx: BotContext,
  day: JobStartDay,
): Promise<void> {
  ctx.session.draft.startDay = day;
  await advance(ctx, Step.CP_WORKERS);
}

export async function onMeal(ctx: BotContext, meal: string): Promise<void> {
  ctx.session.draft.meal = meal;
  await advance(ctx, Step.CP_START_TIME);
}

export async function onSkip(ctx: BotContext): Promise<void> {
  if (ctx.session.step === Step.CP_END_TIME) {
    ctx.session.draft.endTime = null;
    await advance(ctx, Step.CP_ADDRESS);
  } else if (ctx.session.step === Step.CP_BUSES) {
    ctx.session.draft.buses = null;
    await advance(ctx, Step.CP_DESCRIPTION);
  }
}

export async function onConfirm(ctx: BotContext): Promise<void> {
  const telegramId = String(ctx.from?.id);
  const user = await findEmployerByTelegramId(telegramId);
  if (!user) {
    await cancelToMenu(ctx);
    return;
  }
  const post = await submitPost(user, ctx.session.draft);
  ctx.session.step = Step.IDLE;
  ctx.session.mode = undefined;
  ctx.session.repostSourceId = undefined;
  ctx.session.editingPostId = undefined;
  ctx.session.editField = undefined;
  ctx.session.draft = {};
  const text = isVipActive(user)
    ? MSG.postPublishedVip(post.seq)
    : MSG.postCreated(post.seq);
  await ctx.reply(text, {
    reply_markup: mainMenuKeyboard(),
  });
}
