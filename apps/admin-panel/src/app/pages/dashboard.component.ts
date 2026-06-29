import { Component, inject, OnInit, signal } from '@angular/core';
import { DateRangeComponent } from '../shared/date-range.component';
import { ApiService } from '../core/api.service';

interface Stats {
  totalWorkers: number;
  totalClients: number;
  totalPosts: number;
  activePosts: number;
  pendingPosts: number;
  closedPosts: number;
  totalApplications: number;
  todayApplications: number;
  pendingTopups: number;
  vipWorkers: number;
  vipClients: number;
  blockedUsers: number;
  newComplaints: number;
  pendingRegistrations: number;
  pendingApplications: number;
  totalBalance: number;
  trend: { date: string; applications: number; posts: number }[];
}

interface ProfitReport {
  from: string;
  to: string;
  applicationFees: number;
  approvedApplications: number;
  vipSales: number;
  vipPurchases: number;
  refunds: number;
  refundCount: number;
  totalProfit: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DateRangeComponent],
  template: `
    <h1 class="mb-4 text-2xl font-bold">Dashboard</h1>
    @if (stats(); as s) {
      <div class="mb-4 rounded-xl bg-gradient-to-r from-brand to-brand-dark p-6 text-white shadow">
        <div class="text-sm opacity-80">Tizimdagi jami balans</div>
        <div class="text-4xl font-bold">{{ s.totalBalance }} so'm</div>
      </div>

      <div class="card mb-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Foyda hisoboti</h2>
          <div class="flex flex-wrap items-end gap-2">
            <button class="btn-outline" (click)="loadProfitToday()">Bugun</button>
            <app-date-range (rangeChange)="onProfitRange($event)" />
          </div>
        </div>
        @if (profit(); as p) {
          <div class="mb-3 text-sm text-slate-500">
            Davr: {{ p.from === p.to ? p.from : p.from + ' — ' + p.to }}
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div class="text-sm text-emerald-700">Jami foyda</div>
              <div class="text-2xl font-bold text-emerald-900">{{ p.totalProfit }} so'm</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-4">
              <div class="text-sm text-slate-500">Xizmat haqlari</div>
              <div class="text-xl font-bold">{{ p.applicationFees }} so'm</div>
              <div class="text-xs text-slate-400">{{ p.approvedApplications }} ta ariza</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-4">
              <div class="text-sm text-slate-500">VIP sotuvlar</div>
              <div class="text-xl font-bold">{{ p.vipSales }} so'm</div>
              <div class="text-xs text-slate-400">{{ p.vipPurchases }} ta xarid</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-4">
              <div class="text-sm text-slate-500">Qaytarilgan</div>
              <div class="text-xl font-bold text-red-600">−{{ p.refunds }} so'm</div>
              <div class="text-xs text-slate-400">{{ p.refundCount }} ta qaytarish</div>
            </div>
          </div>
        } @else {
          <p class="text-slate-400">Foyda hisoboti yuklanmoqda...</p>
        }
      </div>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="card border-l-4 border-l-blue-500"><div class="text-sm text-slate-500">Ishchilar</div><div class="text-2xl font-bold">{{ s.totalWorkers }}</div></div>
        <div class="card border-l-4 border-l-indigo-500"><div class="text-sm text-slate-500">Mijozlar</div><div class="text-2xl font-bold">{{ s.totalClients }}</div></div>
        <div class="card border-l-4 border-l-green-500"><div class="text-sm text-slate-500">Faol e'lonlar</div><div class="text-2xl font-bold">{{ s.activePosts }}</div></div>
        <div class="card border-l-4 border-l-amber-500"><div class="text-sm text-slate-500">Kutilayotgan e'lonlar</div><div class="text-2xl font-bold">{{ s.pendingPosts }}</div></div>
        <div class="card border-l-4 border-l-slate-500"><div class="text-sm text-slate-500">Yopiq e'lonlar</div><div class="text-2xl font-bold">{{ s.closedPosts }}</div></div>
        <div class="card border-l-4 border-l-teal-500"><div class="text-sm text-slate-500">Jami arizalar</div><div class="text-2xl font-bold">{{ s.totalApplications }}</div></div>
        <div class="card border-l-4 border-l-cyan-500"><div class="text-sm text-slate-500">Bugungi arizalar</div><div class="text-2xl font-bold">{{ s.todayApplications }}</div></div>
        <div class="card border-l-4 border-l-purple-500"><div class="text-sm text-slate-500">VIP ishchilar</div><div class="text-2xl font-bold">{{ s.vipWorkers }}</div></div>
        <div class="card border-l-4 border-l-violet-500"><div class="text-sm text-slate-500">VIP mijozlar</div><div class="text-2xl font-bold">{{ s.vipClients }}</div></div>
        <div class="card border-l-4 border-l-rose-500"><div class="text-sm text-slate-500">Kutilayotgan to'lovlar</div><div class="text-2xl font-bold">{{ s.pendingTopups }}</div></div>
        <div class="card border-l-4 border-l-orange-500"><div class="text-sm text-slate-500">Yangi ro'yxatlar</div><div class="text-2xl font-bold">{{ s.pendingRegistrations }}</div></div>
        <div class="card border-l-4 border-l-pink-500"><div class="text-sm text-slate-500">Yangi shikoyatlar</div><div class="text-2xl font-bold">{{ s.newComplaints }}</div></div>
        <div class="card border-l-4 border-l-red-500"><div class="text-sm text-slate-500">Bloklangan</div><div class="text-2xl font-bold">{{ s.blockedUsers }}</div></div>
      </div>

      <div class="card mt-6">
        <h2 class="mb-3 font-semibold">So'nggi 7 kun</h2>
        <div class="flex items-end gap-3" style="height: 160px">
          @for (d of s.trend; track d.date) {
            <div class="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                class="w-full rounded-t bg-brand"
                [style.height.px]="barHeight(d.applications, s)"
                [title]="d.applications + ' ariza'"
              ></div>
              <span class="text-[10px] text-slate-400">{{ d.date.slice(5) }}</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <p class="text-slate-500">Yuklanmoqda...</p>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  stats = signal<Stats | null>(null);
  profit = signal<ProfitReport | null>(null);

  ngOnInit() {
    this.api.get<Stats>('dashboard/stats').subscribe((s) => this.stats.set(s));
    this.loadProfitToday();
  }

  loadProfitToday() {
    const today = new Date().toISOString().slice(0, 10);
    this.api.get<ProfitReport>('dashboard/profit', { date: today }).subscribe((p) => {
      this.profit.set(p);
    });
  }

  onProfitRange(r: { from: string; to: string }) {
    if (!r.from && !r.to) {
      this.loadProfitToday();
      return;
    }
    this.api
      .get<ProfitReport>('dashboard/profit', { from: r.from, to: r.to })
      .subscribe((p) => this.profit.set(p));
  }

  barHeight(value: number, s: Stats): number {
    const max = Math.max(1, ...s.trend.map((d) => d.applications));
    return Math.round((value / max) * 140);
  }
}
