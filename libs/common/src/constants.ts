/**
 * Global biznes konstantalari. Admin ish vaqtida o'zgartira oladigan qiymatlar
 * Settings jadvalida; bular kompilyatsiya vaqtidagi standart / zaxira qiymatlar.
 */
export const BUSINESS_DEFAULTS = {
  VIP_PRICE: 300_000,
  VIP_DURATION_DAYS: 30,
  MIN_TOPUP_AMOUNT: 20_000,
  PAYMENT_CHECK_TIMEOUT_MINUTES: 3,
  /** "Bugun" gi ishlar hozirdan kamida shuncha daqiqa keyin boshlanishi kerak. */
  TODAY_MIN_LEAD_MINUTES: 30,
  /** Avtomatik xizmat haqi chegaralari (so'm). */
  FEE_THRESHOLD_LOW: 150_000,
  FEE_THRESHOLD_HIGH: 250_000,
  FEE_LOW: 10_000,
  FEE_HIGH: 20_000,
  WORKER_MIN_AGE: 18,
  WORKER_MAX_AGE: 65,
} as const;

export const CONTACTS = {
  ADMIN: '@soatbay_admin',
  ADMIN_EMPLOYER: '@soatbay_uz_admin',
  CHANNEL: '@Soatbay_uz',
} as const;

/**
 * Admin bo'sh qoldirganda ish haqidan xizmat haqini avtomatik hisoblaydi.
 * ish haqi 1 000–150 000  -> 10 000
 * ish haqi 150 000–250 000 -> 20 000
 * 250 000 dan yuqorisi maqbul standart sifatida yuqori haqni saqlaydi.
 */
export function autoServiceFee(salary: number): number {
  if (salary <= BUSINESS_DEFAULTS.FEE_THRESHOLD_LOW) {
    return BUSINESS_DEFAULTS.FEE_LOW;
  }
  return BUSINESS_DEFAULTS.FEE_HIGH;
}
