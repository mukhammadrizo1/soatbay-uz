import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery } from '@soatbay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { buildResult, parsePagination } from '../common/pagination';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { worker: true, jobPost: { include: { employer: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async list(q: PaginationQuery) {
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Prisma.ApplicationWhereInput = q.search
      ? {
          worker: {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search } },
            ],
          },
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { worker: true, jobPost: true },
      }),
      this.prisma.application.count({ where }),
    ]);
    return buildResult(items, total, page, pageSize);
  }
}
