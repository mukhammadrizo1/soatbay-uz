import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_DEFAULT_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? 'admin123';

  // Standart admin akkaunt
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminAccount.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, passwordHash },
  });
  console.log(`✔ Admin account ready: ${adminUsername}`);

  // Standart sozlamalar (karta + biznes standartlari)
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      cardNumber: process.env.DEFAULT_CARD_NUMBER ?? '5614 6819 1147 9941',
      cardHolderName:
        process.env.DEFAULT_CARD_HOLDER ?? "Raximov Otaboy Ergash o'g'li",
      vipPrice: Number(process.env.VIP_PRICE ?? 300000),
      vipDurationDays: Number(process.env.VIP_DURATION_DAYS ?? 30),
      minTopupAmount: Number(process.env.MIN_TOPUP_AMOUNT ?? 20000),
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
