import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma klienti, har bir ilovadan import qilish xavfsiz.
 * Development da ulanish pulini tugatib qo'ymaslik uchun nusxani hot reload lar
 * orasida qayta ishlatamiz.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
