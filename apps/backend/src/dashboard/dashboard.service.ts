import { Injectable } from '@nestjs/common';
import {
  ApplicationPaymentMethod,
  ApplicationStatus,
  RequestStatus,
} from '@prisma/client';
import { autoServiceFee } from '@soatbay/common';
import { ProfitReportDto } from '@soatbay/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalWorkers,
      totalClients,
      totalPosts,
      activePosts,
      pendingPosts,
      closedPosts,
      totalApplications,
      todayApplications,
      pendingTopups,
      vipWorkers,
      vipClients,
      blockedWorkers,
      blockedClients,
      newComplaints,
      pendingRegistrations,
      pendingApplications,
      balanceAgg,
    ] = await Promise.all([
      this.prisma.worker.count(),
      this.prisma.employer.count(),
      this.prisma.jobPost.count(),
      this.prisma.jobPost.count({ where: { status: 'approved' } }),
      this.prisma.jobPost.count({ where: { status: 'pending' } }),
      this.prisma.jobPost.count({ where: { status: 'closed' } }),
      this.prisma.application.count(),
      this.prisma.application.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.depositRequest.count({ where: { status: 'pending' } }),
      this.prisma.worker.count({ where: { isVip: true } }),
      this.prisma.employer.count({ where: { isVip: true } }),
      this.prisma.worker.count({ where: { isBlocked: true } }),
      this.prisma.employer.count({ where: { isBlocked: true } }),
      this.prisma.complaint.count({ where: { status: 'new' } }),
      this.prisma.pendingRequest.count({
        where: { type: 'registration', status: 'pending' },
      }),
      this.prisma.pendingRequest.count({
        where: { type: 'application', status: 'pending' },
      }),
      this.prisma.worker.aggregate({ _sum: { balance: true } }),
    ]);

    return {
      totalWorkers,
      totalClients,
      totalPosts,
      activePosts,
      pendingPosts,
      closedPosts,
      totalApplications,
      todayApplications,
      pendingTopups,
      vipWorkers,
      vipClients,
      blockedUsers: blockedWorkers + blockedClients,
      newComplaints,
      pendingRegistrations,
      pendingApplications,
      totalBalance: balanceAgg._sum.balance ?? 0,
      trend: await this.last7DaysTrend(),
    };
  }

  private async last7DaysTrend() {
    const days: { date: string; applications: number; posts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - i);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const [applications, posts] = await Promise.all([
        this.prisma.application.count({
          where: { createdAt: { gte: from, lt: to } },
        }),
        this.prisma.jobPost.count({
          where: { createdAt: { gte: from, lt: to } },
        }),
      ]);
      days.push({ date: from.toISOString().slice(0, 10), applications, posts });
    }
    return days;
  }

  async profit(q: { from?: string; to?: string; date?: string }): Promise<ProfitReportDto> {
    const { from, to, labelFrom, labelTo } = this.parseReportRange(q);

    const applications = await this.prisma.application.findMany({
      where: {
        status: ApplicationStatus.approved,
        paymentMethod: { not: ApplicationPaymentMethod.vip },
        updatedAt: { gte: from, lt: to },
      },
      include: { jobPost: true },
    });

    let applicationFees = 0;
    for (const app of applications) {
      if (app.feeCharged != null && app.feeCharged > 0) {
        applicationFees += app.feeCharged;
      } else {
        applicationFees +=
          app.jobPost.serviceFee ?? autoServiceFee(app.jobPost.salaryPerPerson);
      }
    }

    const [vipAgg, refundAgg] = await Promise.all([
      this.prisma.vipPurchase.aggregate({
        where: {
          status: RequestStatus.approved,
          createdAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.balanceTransaction.aggregate({
        where: {
          type: 'refund',
          createdAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const vipSales = vipAgg._sum.amount ?? 0;
    const refunds = refundAgg._sum.amount ?? 0;

    return {
      from: labelFrom,
      to: labelTo,
      applicationFees,
      approvedApplications: applications.length,
      vipSales,
      vipPurchases: vipAgg._count,
      refunds,
      refundCount: refundAgg._count,
      totalProfit: applicationFees + vipSales - refunds,
    };
  }

  private parseReportRange(q: { from?: string; to?: string; date?: string }) {
    if (q.date) {
      const from = new Date(`${q.date}T00:00:00`);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return { from, to, labelFrom: q.date, labelTo: q.date };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = q.from ? new Date(`${q.from}T00:00:00`) : today;
    const endDay = q.to ? new Date(`${q.to}T00:00:00`) : q.from ? from : today;
    const to = new Date(endDay);
    to.setDate(to.getDate() + 1);

    return {
      from,
      to,
      labelFrom: from.toISOString().slice(0, 10),
      labelTo: endDay.toISOString().slice(0, 10),
    };
  }
}
