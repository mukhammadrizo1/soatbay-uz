/** API / bot holat qiymatlarini o'zbekcha ko'rsatish. */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Bekor qilingan',
  warned: 'Ogohlantirilgan',
  blocked: 'Bloklangan',
  closed: 'Yopiq',
  inactive: 'Nofaol',
  draft: 'Qoralama',
  cancelled: 'Bekor qilingan',
  new: 'Yangi',
  'in-progress': 'Jarayonda',
  resolved: 'Yakunlangan',
};

const PAYMENT_LABELS: Record<string, string> = {
  vip: 'VIP',
  balance: 'Balans',
  'card-check': 'Karta (chek)',
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_LABELS[method] ?? method;
}
