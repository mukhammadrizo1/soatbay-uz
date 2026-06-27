/** Summani minglik ajratuvchi probellar bilan formatlaydi: 200000 -> "200 000". */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatSom(amount: number | null | undefined): string {
  return `${formatMoney(amount)} so'm`;
}

/** Kanal kartalarida nuqta bilan: 5000000 -> "5.000.000". */
export function formatMoneyDots(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** today/tomorrow dan aniq sanani aniqlaydi. */
export function resolveStartDate(
  day: 'today' | 'tomorrow',
  now: Date = new Date(),
): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (day === 'tomorrow') d.setDate(d.getDate() + 1);
  return d;
}

export function startDayLabel(day: 'today' | 'tomorrow'): string {
  return day === 'today' ? 'Bugun' : 'Ertaga';
}

/** Bir xil kalendar kuni ekanini taqqoslash. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** E'lon `startDate` + `startTime` dan ish boshlanish vaqtini quradi. */
export function jobStartDateTime(startDate: Date, startTime: string): Date {
  const d = new Date(startDate);
  const parts = startTime.trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Ish boshlanishiga 3 soatdan ko'p qolgan bo'lsa masofa skrinshoti talab qilinmaydi. */
export function requiresDistanceScreenshot(
  startDate: Date,
  startTime: string,
  now: Date = new Date(),
): boolean {
  const msUntilStart = jobStartDateTime(startDate, startTime).getTime() - now.getTime();
  return msUntilStart <= 3 * 60 * 60 * 1000;
}

/** VIP tarif faol (muddati o'tmagan). */
export function isVipActive(user: {
  isVip: boolean;
  vipExpiresAt: Date | null;
}): boolean {
  if (!user.isVip) return false;
  if (!user.vipExpiresAt) return true;
  return user.vipExpiresAt.getTime() > Date.now();
}
