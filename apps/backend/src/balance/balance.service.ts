import { Injectable } from '@nestjs/common';
import { BalanceTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ishchi hisobini atomik o'zgartiradi va BalanceTransaction yozadi. */
  async adjust(
    workerId: string,
    amount: number,
    type: BalanceTransactionType,
    meta?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const worker = await client.worker.update({
      where: { id: workerId },
      data: { balance: { increment: amount } },
    });
    await client.balanceTransaction.create({
      data: {
        workerId,
        amount,
        type,
        balanceAfter: worker.balance,
        meta,
      },
    });
    return worker.balance;
  }
}
