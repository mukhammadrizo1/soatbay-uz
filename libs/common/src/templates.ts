import { JobMeal } from '@soatbay/shared-types';
import { formatMoneyDots, formatSom, startDayLabel } from './formatters';
import { MSG } from './messages';

export interface PostCardData {
  startDay: 'today' | 'tomorrow';
  workersNeeded: number;
  salaryPerPerson: number;
  meal: JobMeal | null;
  startTime: string;
  endTime: string | null;
  address: string;
  location: { lat: number; lng: number } | null;
  buses?: string | null;
  description: string;
  contactPhone: string;
}

/** Yig'ilgan ish beruvchi e'loni ko'rinishi / kanal kartasi. */
export function renderPostCard(d: PostCardData): string {
  const timeRange = d.endTime
    ? `${d.startTime} - ${d.endTime}`
    : `${d.startTime} - ${MSG.endTimeUntilDone}`;
  const lines = [
    `📅 Qachon: ${startDayLabel(d.startDay)}`,
    `🫂 Ishchilar: ${d.workersNeeded}`,
    `💸 Ish haqqi: ${d.salaryPerPerson}`,
    `🍛 Ovqat: ${d.meal ?? MSG.notProvided}`,
    `⏰ Vaqt: ${timeRange}`,
    `📍 Manzil: ${d.address}`,
    `📍 Lokatsiya: ${d.location ? `${d.location.lat}, ${d.location.lng}` : MSG.notProvided}`,
  ];
  if (d.buses) lines.push(`🚌 Avtobuslar: ${d.buses}`);
  lines.push(`📝 Qo'shimcha: ${d.description}`);
  lines.push(`📞 Telefon: ${d.contactPhone}`);
  return lines.join('\n');
}

/** Telegram kanaliga joylanadigan e'lon kartasi (namuna: Kaska UZ kanali). */
export interface ChannelPostCardData {
  seq: number;
  startDay: 'today' | 'tomorrow';
  workersNeeded: number;
  salaryPerPerson: number;
  meal: JobMeal | null;
  startTime: string;
  endTime: string | null;
  address: string;
  serviceFee: number;
  description: string;
  buses?: string | null;
  isClosed: boolean;
  isInactive?: boolean;
}

export function renderChannelPostCard(d: ChannelPostCardData): string {
  const timeRange = d.endTime
    ? `${d.startTime} - ${d.endTime}`
    : `${d.startTime} - ${MSG.endTimeUntilDone}`;
  const lines = [
    `💰 Ish haqqi: ${formatMoneyDots(d.salaryPerPerson)}`,
    `🫂 Ishchilar: ${d.workersNeeded}`,
    `🍛 Ovqat: ${d.meal ?? MSG.notProvided}`,
    `⏰ Vaqt: ${timeRange}`,
    `📱 Manzil: ${d.address}`,
    `🌟 Xizmat haqi: ${formatSom(d.serviceFee)}`,
  ];
  if (d.buses) lines.push(`🚌 Avtobuslar: ${d.buses}`);
  lines.push(`📝 Qo'shimcha: ${d.description}`);
  lines.push('');
  const statusText = d.isInactive
    ? 'Nofaol'
    : d.isClosed
      ? 'Yopiq'
      : 'Ochiq';
  const statusIcon = d.isInactive || d.isClosed ? '🔴' : '🟢';
  lines.push(`${statusIcon} Holat: ${statusText}`);
  lines.push(`📅 ${startDayLabel(d.startDay)}`);
  lines.push(`№ ${d.seq}`);
  return lines.join('\n');
}

/** Ishchi ro'yxatdan o'tishini tasdiqlash kartasi. */
export function renderWorkerInfoCard(d: {
  fullName: string;
  phone: string;
  age: number;
  passportSent: boolean;
}): string {
  return [
    "✅ Ma'lumotlaringiz:",
    '',
    `👤 Ism familiya: ${d.fullName}`,
    `📞 Telefon: ${d.phone}`,
    `🎂 Yosh: ${d.age}`,
    `📸 Pasport rasmi: ${d.passportSent ? '✅ Yuborilgan' : '❌ Yuborilmagan'}`,
  ].join('\n');
}

/** Ishchining "Mening ma'lumotlarim" profil kartasi. */
export function renderWorkerProfileCard(d: {
  fullName: string;
  phone: string;
  age: number | null;
  hasPassport: boolean;
  isVip: boolean;
  balance: number;
}): string {
  return [
    "👤 Mening ma'lumotlarim:",
    '',
    `👤 Ism familiya: ${d.fullName}`,
    `📞 Telefon: ${d.phone}`,
    `🎂 Yosh: ${d.age ?? '-'}`,
    `📸 Pasport rasmi: ${d.hasPassport ? 'Bor' : "yo'q"}`,
    `VIP: ${d.isVip ? 'xa' : "yo'q"}`,
    `Hisob: ${formatSom(d.balance)}`,
  ].join('\n');
}

/** Hisob to'ldirish / to'lov kartasi matni (karta raqami + egasi). */
export function renderCardDetails(cardNumber: string, holder: string): string {
  return `💳 ${cardNumber}\n${holder}`;
}

/** Hisobdan yechish orqali yozilishni tasdiqlash. */
export function renderBalanceApplyCard(d: {
  applicationId: string | number;
  salary: number;
  fee: number;
  balance: number;
}): string {
  return [
    `📋 Ishga yozilish: #${d.applicationId}`,
    `💰 Ish haqqi: ${formatSom(d.salary)}`,
    `🌟 Xizmat haqi: ${formatSom(d.fee)}`,
    `💳 Ushbu ${formatSom(d.fee)}lik to'lovni hisobingizdan yechib olinishiga rozimisiz`,
    `Joriy hisobingiz: ${formatSom(d.balance)}`,
    '',
    MSG.worker.noShowWarningShort,
  ].join('\n');
}

/** Karta-chek (hisob yetarli emas) orqali yozilish ko'rsatmalari. */
export function renderCardApplyCard(d: {
  applicationId: string | number;
  salary: number;
  fee: number;
  cardNumber: string;
  cardHolder: string;
}): string {
  return [
    `📋 Ishga yozilish: #${d.applicationId}`,
    `💰 Ish haqqi: ${formatSom(d.salary)}`,
    `🌟 Xizmat haqi: ${formatSom(d.fee)}`,
    `💳 ${d.cardNumber}`,
    d.cardHolder,
    `💳 Ushbu karta raqamga ${formatSom(d.fee)}lik to'lov checkini yuboring (3 daqiqa ichida):`,
    "⚠️ Faqat rasm yuboring, file yoki boshqa ma'lumot yubormang check haqida",
    '',
    MSG.worker.noShowWarningShort,
  ].join('\n');
}

/** Hisob to'ldirish ko'rsatmalari kartasi. */
export function renderTopupCard(d: {
  cardNumber: string;
  cardHolder: string;
  minAmount: number;
}): string {
  return [
    `💳 ${d.cardNumber}`,
    d.cardHolder,
    `💳 Ushbu karta raqamga istalgan summa ( minimal ${formatSom(d.minAmount)} ) to'lov qiling va checkini yuboring`,
    "⚠️ Faqat rasm yuboring, file yoki boshqa ma'lumot yubormang",
  ].join('\n');
}
