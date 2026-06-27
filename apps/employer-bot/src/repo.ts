import { prisma, Employer, JobMeal, JobPostStatus } from '@soatbay/database';
import { resolveStartDate, autoServiceFee, isVipActive } from '@soatbay/common';
import { PostDraft } from './session';
import { publishPostToChannel } from './channel-post';

const mealMap: Record<string, JobMeal> = {
  '1 mahal': JobMeal.ONCE,
  '2 mahal': JobMeal.TWICE,
  "yo'q": JobMeal.NONE,
};

export function findEmployerByTelegramId(
  telegramId: string,
): Promise<Employer | null> {
  return prisma.employer.findUnique({ where: { telegramId } });
}

export function findEmployerByPhone(phone: string): Promise<Employer | null> {
  return prisma.employer.findUnique({ where: { phone } });
}

/** Telefon boshqa mijozda band bo'lsa true (o'z telefonidan tashqari). */
export async function isEmployerPhoneTaken(
  phone: string,
  exceptEmployerId?: string,
): Promise<boolean> {
  const existing = await findEmployerByPhone(phone);
  return !!existing && existing.id !== exceptEmployerId;
}

export function createEmployer(
  telegramId: string,
  fullName: string,
  phone: string,
): Promise<Employer> {
  return prisma.employer.create({
    data: { telegramId, fullName, phone },
  });
}

/** Qoralamani saqlaydi; VIP mijozda admin tekshiruvisiz kanalga joylanadi. */
export async function submitPost(employer: Employer, draft: PostDraft) {
  const baseData = {
    employerId: employer.id,
    startDate: resolveStartDate(draft.startDay === 'tomorrow' ? 'tomorrow' : 'today'),
    startDay: draft.startDay === 'tomorrow' ? 'tomorrow' : 'today',
    workersNeeded: draft.workersNeeded ?? 1,
    salaryPerPerson: draft.salaryPerPerson ?? 0,
    meal: mealMap[draft.meal ?? "yo'q"] ?? JobMeal.NONE,
    startTime: draft.startTime ?? '08:00',
    endTime: draft.endTime ?? null,
    address: draft.address ?? '',
    locationLat: draft.location?.lat ?? null,
    locationLng: draft.location?.lng ?? null,
    buses: draft.buses ?? null,
    description: draft.description ?? '',
    contactPhone: draft.contactPhone ?? '',
  };

  if (isVipActive(employer)) {
    const fee = autoServiceFee(baseData.salaryPerPerson);
    const post = await prisma.jobPost.create({
      data: {
        ...baseData,
        serviceFee: fee,
        status: JobPostStatus.approved,
      },
    });
    await publishPostToChannel(post.id);
    return post;
  }

  const post = await prisma.jobPost.create({
    data: { ...baseData, status: JobPostStatus.pending },
  });

  await prisma.pendingRequest.create({
    data: {
      type: 'post',
      employerId: employer.id,
      jobPostId: post.id,
      payload: { kind: 'job-post', postId: post.id },
    },
  });

  return post;
}

/** Mavjud e'lonni qoralama bilan qayta yozadi ("E'lonni tahrirlash" ishlatadi). */
export function updatePostFromDraft(postId: string, draft: PostDraft) {
  return prisma.jobPost.update({
    where: { id: postId },
    data: {
      startDate: resolveStartDate(draft.startDay === 'tomorrow' ? 'tomorrow' : 'today'),
      startDay: draft.startDay === 'tomorrow' ? 'tomorrow' : 'today',
      workersNeeded: draft.workersNeeded ?? 1,
      salaryPerPerson: draft.salaryPerPerson ?? 0,
      meal: mealMap[draft.meal ?? "yo'q"] ?? JobMeal.NONE,
      startTime: draft.startTime ?? '08:00',
      endTime: draft.endTime ?? null,
      address: draft.address ?? '',
      locationLat: draft.location?.lat ?? null,
      locationLng: draft.location?.lng ?? null,
      buses: draft.buses ?? null,
      description: draft.description ?? '',
      contactPhone: draft.contactPhone ?? '',
    },
  });
}

export function listMyPosts(employerId: string, skip = 0, take = 5) {
  return prisma.jobPost.findMany({
    where: { employerId },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countMyPosts(employerId: string) {
  return prisma.jobPost.count({ where: { employerId } });
}

export function listInProgressPosts(employerId: string, skip = 0, take = 5) {
  return prisma.jobPost.findMany({
    where: { employerId, status: { in: ['pending', 'draft'] } },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countInProgressPosts(employerId: string) {
  return prisma.jobPost.count({
    where: { employerId, status: { in: ['pending', 'draft'] } },
  });
}

export async function findOwnedInProgressPost(
  employerId: string,
  seqInput: string,
) {
  const seq = Number(seqInput);
  if (!Number.isInteger(seq)) return null;
  return prisma.jobPost.findFirst({
    where: { seq, employerId, status: { in: ['pending', 'draft'] } },
  });
}

export async function findOwnedPublishedPost(
  employerId: string,
  seqInput: string,
) {
  const seq = Number(seqInput);
  if (!Number.isInteger(seq)) return null;
  return prisma.jobPost.findFirst({
    where: {
      seq,
      employerId,
      status: { in: ['approved', 'closed'] },
    },
  });
}

export function listApplicants(postId: string) {
  return prisma.application.findMany({
    where: { jobPostId: postId, status: 'approved' },
    include: { worker: true },
    orderBy: { createdAt: 'asc' },
  });
}

export function updateProfileFullName(employerId: string, fullName: string) {
  return prisma.employer.update({ where: { id: employerId }, data: { fullName } });
}

export function updateProfilePhone(employerId: string, phone: string) {
  return prisma.employer.update({ where: { id: employerId }, data: { phone } });
}

/** Qayta ro'yxatdan o'tishni yakunlaydi (mavjud mijoz profilini yangilaydi). */
export function completeEmployerReregistration(
  telegramId: string,
  fullName: string,
  phone: string,
) {
  return prisma.employer.update({
    where: { telegramId },
    data: { fullName, phone, needsReregistration: false },
  });
}
