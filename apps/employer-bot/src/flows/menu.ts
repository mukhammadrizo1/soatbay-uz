import { InlineKeyboard } from 'grammy';
import {
  MSG,
  formatSom,
  isValidPhone,
  normalizePhone,
  startDayLabel,
  statusLabel,
} from '@soatbay/common';
import { BotContext, PostDraft, Step } from '../session';
import {
  cancelToMenuKeyboard,
  mainMenuKeyboard,
  paginationKeyboard,
} from '../keyboards';
import { showEditMenu } from './create-post';
import {
  countInProgressPosts,
  countMyPosts,
  findOwnedInProgressPost,
  findOwnedPublishedPost,
  findEmployerByTelegramId,
  isEmployerPhoneTaken,
  listApplicants,
  listInProgressPosts,
  listMyPosts,
  updateProfileFullName,
  updateProfilePhone,
} from '../repo';

const PAGE_SIZE = 5;

/** Saqlangan e'londan in-memory qoralama quradi (tahrirlash / qayta e'lon). */
function draftFromPost(post: {
  startDay: string;
  workersNeeded: number;
  salaryPerPerson: number;
  meal: string;
  startTime: string;
  endTime: string | null;
  address: string;
  locationLat: number | null;
  locationLng: number | null;
  buses: string | null;
  description: string;
  contactPhone: string;
}): PostDraft {
  const mealLabel: Record<string, string> = {
    once: '1 mahal',
    twice: '2 mahal',
    none: "yo'q",
  };
  return {
    startDay: post.startDay === 'tomorrow' ? ('tomorrow' as never) : ('today' as never),
    workersNeeded: post.workersNeeded,
    salaryPerPerson: post.salaryPerPerson,
    meal: mealLabel[post.meal] ?? "yo'q",
    startTime: post.startTime,
    endTime: post.endTime,
    address: post.address,
    location:
      post.locationLat != null && post.locationLng != null
        ? { lat: post.locationLat, lng: post.locationLng }
        : null,
    buses: post.buses,
    description: post.description,
    contactPhone: post.contactPhone,
  };
}

function shortPost(p: {
  seq: number;
  startDay: string;
  workersNeeded: number;
  salaryPerPerson: number;
  status: string;
}): string {
  return `#${p.seq}\n📅 ${startDayLabel(p.startDay as 'today' | 'tomorrow')} | 🫂 ${p.workersNeeded} | 💸 ${formatSom(p.salaryPerPerson)} | ${statusLabel(p.status)}`;
}

export async function showMyPosts(ctx: BotContext, page = 1): Promise<void> {
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return;
  const total = await countMyPosts(user.id);
  if (total === 0) {
    await ctx.reply(MSG.noPosts);
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);
  const posts = await listMyPosts(user.id, (p - 1) * PAGE_SIZE, PAGE_SIZE);
  await ctx.reply(
    `${posts.map(shortPost).join('\n\n')}\n\n📄 ${p}/${totalPages}`,
    { reply_markup: paginationKeyboard('mp', p, totalPages) },
  );
}

export async function showInProgress(ctx: BotContext, page = 1): Promise<void> {
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return;
  const total = await countInProgressPosts(user.id);
  if (total === 0) {
    await ctx.reply(MSG.noInProgressPosts);
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);
  const posts = await listInProgressPosts(user.id, (p - 1) * PAGE_SIZE, PAGE_SIZE);
  await ctx.reply(
    `${posts.map(shortPost).join('\n\n')}\n\n📄 ${p}/${totalPages}`,
    { reply_markup: paginationKeyboard('ip', p, totalPages) },
  );
}

export async function askPostId(ctx: BotContext, step: Step): Promise<void> {
  ctx.session.step = step;
  await ctx.reply(MSG.askPostId, { reply_markup: cancelToMenuKeyboard() });
}

export async function showApplicants(ctx: BotContext, postId: string): Promise<void> {
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return;
  const post = await findOwnedPublishedPost(user.id, postId);
  if (!post) {
    await ctx.reply(MSG.postNotFound, { reply_markup: cancelToMenuKeyboard() });
    return;
  }
  const applicants = await listApplicants(post.id);
  ctx.session.step = Step.IDLE;
  if (applicants.length === 0) {
    await ctx.reply(MSG.noApplicants, { reply_markup: mainMenuKeyboard() });
    return;
  }
  const body = applicants
    .map((a, i) => `${i + 1}. ${a.worker.fullName} — ${a.worker.phone}`)
    .join('\n');
  await ctx.reply(`${MSG.applicantsHeader}\n\n${body}`, {
    reply_markup: mainMenuKeyboard(),
  });
}

/** "E'lonni tahrirlash": mavjud jarayondagi e'lonni maydon menyusi orqali tahrirlaydi. */
export async function startEditPost(ctx: BotContext, postId: string): Promise<void> {
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return;
  const post = await findOwnedInProgressPost(user.id, postId);
  if (!post) {
    await ctx.reply(MSG.postNotFound, { reply_markup: cancelToMenuKeyboard() });
    return;
  }
  ctx.session.mode = 'edit';
  ctx.session.editingPostId = post.id;
  ctx.session.repostSourceId = undefined;
  ctx.session.editField = undefined;
  ctx.session.draft = draftFromPost(post);
  await showEditMenu(ctx);
}

export async function startRepost(ctx: BotContext, postId: string): Promise<void> {
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return;
  const post = await findOwnedInProgressPost(user.id, postId);
  if (!post) {
    await ctx.reply(MSG.postNotFound, { reply_markup: cancelToMenuKeyboard() });
    return;
  }
  // In-memory nusxa yuklanadi; "Qayta chiqarish" gacha bazaga hech narsa yozilmaydi.
  ctx.session.mode = 'repost';
  ctx.session.repostSourceId = post.id;
  ctx.session.editingPostId = undefined;
  ctx.session.editField = undefined;
  ctx.session.draft = draftFromPost(post);
  ctx.session.step = Step.IDLE;
  const kb = new InlineKeyboard()
    .text(MSG.repostEdit, 'repost:edit')
    .text(MSG.repostPublish, 'repost:publish')
    .row()
    .text(MSG.btn.mainMenu, 'cp:menu');
  await ctx.reply(
    `#${post.seq}\n\n${MSG.employer.fakeDataWarningShort}`,
    { reply_markup: kb },
  );
}

export async function showEditProfile(ctx: BotContext): Promise<void> {
  const kb = new InlineKeyboard()
    .text(MSG.editProfileFio, 'profile:fio')
    .text(MSG.editProfilePhone, 'profile:phone')
    .row()
    .text(MSG.btn.mainMenu, 'cp:menu');
  await ctx.reply(MSG.employerMenu.editProfile, { reply_markup: kb });
}

export async function handleProfileText(ctx: BotContext): Promise<boolean> {
  const text = (ctx.message?.text ?? '').trim();
  const user = await findEmployerByTelegramId(String(ctx.from?.id));
  if (!user) return false;

  if (ctx.session.step === Step.EDIT_PROFILE_FIO) {
    if (text.length < 3) {
      await ctx.reply(MSG.invalidFullName);
      return true;
    }
    await updateProfileFullName(user.id, text);
    ctx.session.step = Step.IDLE;
    await ctx.reply(MSG.profileUpdated, { reply_markup: mainMenuKeyboard() });
    return true;
  }

  if (ctx.session.step === Step.EDIT_PROFILE_PHONE) {
    if (!isValidPhone(text)) {
      await ctx.reply(MSG.invalidPhone);
      return true;
    }
    const phone = normalizePhone(text)!;
    if (await isEmployerPhoneTaken(phone, user.id)) {
      await ctx.reply(MSG.phoneTaken);
      return true;
    }
    await updateProfilePhone(user.id, phone);
    ctx.session.step = Step.IDLE;
    await ctx.reply(MSG.profileUpdated, { reply_markup: mainMenuKeyboard() });
    return true;
  }

  return false;
}
