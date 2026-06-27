import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQuery } from '@soatbay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { buildResult, parsePagination } from '../common/pagination';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const [items, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { worker: true },
      }),
      this.prisma.depositRequest.count(),
    ]);
    return buildResult(items, total, page, pageSize);
  }

  async detail(id: string) {
    const dep = await this.prisma.depositRequest.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!dep) throw new NotFoundException('Deposit not found');
    return dep;
  }
}
