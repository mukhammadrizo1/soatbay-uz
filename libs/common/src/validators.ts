import { BUSINESS_DEFAULTS } from './constants';

/**
 * `+998901234567` yoki `901234567` (9 raqam, ixtiyoriy +998 prefiksi) ni qabul qiladi.
 * Kanonik `+998XXXXXXXXX` shaklini, yaroqsiz bo'lsa null qaytaradi.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  // +998901234567
  let m = /^\+998(\d{9})$/.exec(cleaned);
  if (m) return `+998${m[1]}`;
  // 998901234567
  m = /^998(\d{9})$/.exec(cleaned);
  if (m) return `+998${m[1]}`;
  // 901234567
  m = /^(\d{9})$/.exec(cleaned);
  if (m) return `+998${m[1]}`;
  return null;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

/** Butun son (kerakli ishchilar soni) ni o'qiydi. Musbat butun bo'lmasa null. */
export function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Pul summasini o'qiydi, barcha probellarni olib tashlaydi. Yaroqsiz bo'lsa null. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** HH:MM ni 00:00–23:59 oralig'ida tekshiradi. Normallashtirilgan "HH:MM" yoki null. */
export function parseTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** `day` dagi `time` (HH:MM) hozirdan kamida minLeadMinutes keyin bo'lsa true. */
export function isStartTimeValid(
  time: string,
  day: 'today' | 'tomorrow',
  now: Date = new Date(),
  minLeadMinutes: number = BUSINESS_DEFAULTS.TODAY_MIN_LEAD_MINUTES,
): boolean {
  if (day === 'tomorrow') return true;
  const parsed = parseTime(time);
  if (!parsed) return false;
  const [h, min] = parsed.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, min, 0, 0);
  const diffMinutes = (target.getTime() - now.getTime()) / 60_000;
  return diffMinutes >= minLeadMinutes;
}

export function isValidAge(age: number): boolean {
  return (
    Number.isInteger(age) &&
    age >= BUSINESS_DEFAULTS.WORKER_MIN_AGE &&
    age <= BUSINESS_DEFAULTS.WORKER_MAX_AGE
  );
}

/**
 * "41.123, 69.456" kabi erkin matndan koordinatalarni o'qiydi.
 * Telegram lokatsiya obyektlari bot qatlamida alohida ishlovdan o'tkazilishi kerak.
 */
export function parseCoordinates(
  raw: string,
): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(
    raw,
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
