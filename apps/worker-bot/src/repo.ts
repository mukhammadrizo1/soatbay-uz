import {
  prisma,
  Worker,
  JobPost,
  ApplicationStatus,
  ApplicationPaymentMethod,
} from '@soatbay/database';
import { isSameDay } from '@soatbay/common';

export function findWorkerByTelegramId(
  telegramId: string,
): Promise<Worker | null> {
  return prisma.worker.findUnique({ where: { telegramId } });
}

export function findWorkerByPhone(phone: string): Promise<Worker | null> {
  return prisma.worker.findUnique({ where: { phone } });
}

export function getPost(postId: string): Promise<JobPost | null> {
  return prisma.jobPost.findUnique({
    where: { id: postId },
    include: { employer: true },
  });
}

/** Ishchi o'z e'loniga yozila olmaydi (bir xil telegramId). */
export async function isOwnJobPost(
  worker: Worker,
  post: JobPost | string,
): Promise<boolean> {
  if (!worker.telegramId) return false;
  const record =
    typeof post === 'string'
      ? await prisma.jobPost.findUnique({
          where: { id: post },
          include: { employer: { select: { telegramId: true } } },
        })
      : await prisma.jobPost.findUnique({
          where: { id: post.id },
          include: { employer: { select: { telegramId: true } } },
        });
  if (!record?.employer.telegramId) return false;
  return worker.telegramId === record.employer.telegramId;
}

export async function upsertWorker(
  telegramId: string,
  data: { fullName: string; phone: string; age: number; passportPhotoUrl: string },
): Promise<Worker> {
  const existing = await prisma.worker.findUnique({ where: { telegramId } });
  if (existing) {
    return prisma.worker.update({
      where: { telegramId },
      data: { ...data, offerAccepted: true },
    });
  }
  return prisma.worker.create({
    data: { telegramId, ...data, offerAccepted: true },
  });
}

export function markOfferAccepted(telegramId: string) {
  return prisma.worker.update({
    where: { telegramId },
    data: { offerAccepted: true },
  });
}

export function submitRegistration(workerId: string) {
  return prisma.pendingRequest.create({
    data: {
      type: 'registration',
      workerId,
      payload: { kind: 'registration' },
    },
  });
}

export async function isBusyOnDate(workerId: string, date: Date): Promise<boolean> {
  const apps = await prisma.application.findMany({
    where: { workerId, status: ApplicationStatus.approved },
  });
  return apps.some((a) => isSameDay(a.jobDate, date));
}

export async function hasPendingOnDate(
  workerId: string,
  date: Date,
): Promise<boolean> {
  const apps = await prisma.application.findMany({
    where: { workerId, status: ApplicationStatus.pending },
  });
  return apps.some((a) => isSameDay(a.jobDate, date));
}

export async function freeSlots(post: JobPost): Promise<number> {
  const approved = await prisma.application.count({
    where: { jobPostId: post.id, status: ApplicationStatus.approved },
  });
  return post.workersNeeded - approved;
}

export function createApplication(
  postId: string,
  workerId: string,
  jobDate: Date,
  distanceScreenshotUrl: string | null,
) {
  return prisma.application.create({
    data: {
      jobPostId: postId,
      workerId,
      jobDate,
      distanceScreenshotUrl,
      status: ApplicationStatus.pending,
    },
  });
}

export function listMyApplications(workerId: string) {
  return prisma.application.findMany({
    where: { workerId },
    orderBy: { createdAt: 'desc' },
    include: { jobPost: true },
    take: 20,
  });
}

export function updatePhone(workerId: string, phone: string) {
  return prisma.worker.update({ where: { id: workerId }, data: { phone } });
}

export async function createDepositRequest(
  workerId: string,
  amount: number,
  checkPhotoUrl: string,
) {
  const deposit = await prisma.depositRequest.create({
    data: { workerId, amount, checkPhotoUrl },
  });
  await prisma.pendingRequest.create({
    data: {
      type: 'topup',
      workerId,
      payload: { kind: 'topup', amount, depositId: deposit.id, checkPhotoUrl },
    },
  });
  return deposit;
}

export async function createApplicationPaymentRequest(
  workerId: string,
  applicationId: string,
  checkPhotoUrl: string,
) {
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      paymentMethod: ApplicationPaymentMethod.card_check,
      paymentCheckUrl: checkPhotoUrl,
    },
  });
  await prisma.pendingRequest.create({
    data: {
      type: 'application',
      workerId,
      applicationId,
      payload: { kind: 'application-payment', checkPhotoUrl },
    },
  });
}

export async function cancelUnpaidApplication(
  applicationId: string,
): Promise<boolean> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app) return false;
  if (app.status !== ApplicationStatus.pending || app.paymentCheckUrl) {
    return false;
  }
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.cancelled },
  });
  return true;
}

export function createComplaint(
  workerId: string,
  text: string | null,
  attachments: unknown[],
) {
  return prisma.complaint.create({
    data: { workerId, text, attachments: attachments as never },
  });
}
