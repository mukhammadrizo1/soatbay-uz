import { prisma } from '@soatbay/database';
import { BUSINESS_DEFAULTS } from '@soatbay/common';

export interface RuntimeSettings {
  cardNumber: string;
  cardHolderName: string;
  vipPrice: number;
  vipDurationDays: number;
  minTopupAmount: number;
}

export async function getSettings(): Promise<RuntimeSettings> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (s) {
    return {
      cardNumber: s.cardNumber,
      cardHolderName: s.cardHolderName,
      vipPrice: s.vipPrice,
      vipDurationDays: s.vipDurationDays,
      minTopupAmount: s.minTopupAmount,
    };
  }
  return {
    cardNumber: process.env.DEFAULT_CARD_NUMBER ?? '5614 6819 1147 9941',
    cardHolderName:
      process.env.DEFAULT_CARD_HOLDER ?? "Raximov Otaboy Ergash o'g'li",
    vipPrice: BUSINESS_DEFAULTS.VIP_PRICE,
    vipDurationDays: BUSINESS_DEFAULTS.VIP_DURATION_DAYS,
    minTopupAmount: BUSINESS_DEFAULTS.MIN_TOPUP_AMOUNT,
  };
}
