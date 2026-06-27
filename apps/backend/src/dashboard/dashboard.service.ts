import { Injectable } from '@nestjs/common';
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
}
