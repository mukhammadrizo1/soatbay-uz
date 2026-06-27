import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { BUSINESS_DEFAULTS } from '@soatbay/common';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_DEFAULT_USERNAME ?? 'admin';
  const adminPassword =
    process.env.ADMIN_DEFAULT_PASSWORD ??
    (process.env.NODE_ENV === 'production' ? undefined : 'admin123');

  if (!adminPassword) {
    throw new Error(
      'ADMIN_DEFAULT_PASSWORD production uchun Render Environment da majburiy.',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminAccount.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, passwordHash },
  });
  console.log(`✔ Admin account ready: ${adminUsername}`);

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      cardNumber:
        process.env.DEFAULT_CARD_NUMBER ?? BUSINESS_DEFAULTS.DEFAULT_CARD_NUMBER,
      cardHolderName:
        process.env.DEFAULT_CARD_HOLDER ?? BUSINESS_DEFAULTS.DEFAULT_CARD_HOLDER,
      vipPrice: Number(process.env.VIP_PRICE ?? BUSINESS_DEFAULTS.VIP_PRICE),
      vipDurationDays: Number(
        process.env.VIP_DURATION_DAYS ?? BUSINESS_DEFAULTS.VIP_DURATION_DAYS,
      ),
      minTopupAmount: Number(
        process.env.MIN_TOPUP_AMOUNT ?? BUSINESS_DEFAULTS.MIN_TOPUP_AMOUNT,
      ),
    },
  });
  console.log('✔ Default settings ready');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
