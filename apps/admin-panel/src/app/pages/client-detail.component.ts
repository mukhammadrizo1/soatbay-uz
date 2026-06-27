import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { UserMessageComponent } from '../shared/user-message.component';
import { statusLabel } from '../shared/status-labels';

interface ClientDetail {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
  telegramId: string | null;
  isBlocked: boolean;
  blockReason: string | null;
  isVip: boolean;
  vipExpiresAt: string | null;
  needsReregistration?: boolean;
  createdAt: string;
  jobPosts: {
    id: string;
    seq: number;
    salaryPerPerson: number;
    status: string;
    createdAt: string;
  }[];
  activity: { action: string; entity: string; createdAt: string }[];
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, UserMessageComponent],
  template: `
    <a class="text-sm text-brand" routerLink="/clients">&larr; Mijozlar</a>
    @if (client(); as c) {
      <div class="mb-4 mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">#{{ c.seq }} · {{ c.fullName }}</h1>
          <p class="text-slate-500">{{ c.phone }}</p>
          @if (c.telegramId) {
            <p class="text-xs text-slate-400">Telegram: {{ c.telegramId }}</p>
          }
          <span class="badge mt-1" [class]="c.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
            {{ c.isBlocked ? 'Bloklangan' : 'Faol' }}
          </span>
          @if (c.isBlocked && c.blockReason) {
            <p class="mt-1 text-sm text-red-600">Blok sababi: {{ c.blockReason }}</p>
          }
          @if (c.isVip) {
            <span class="badge ml-1 bg-amber-100 text-amber-800">VIP mijoz</span>
          }
          @if (c.needsReregistration) {
            <span class="badge ml-1 bg-orange-100 text-orange-800">Qayta ro'yxat kutilmoqda</span>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          <app-user-message [userId]="c.id" />
          <button class="btn-outline" (click)="reregister()" [disabled]="!c.telegramId">
            Qayta ro'yxatdan o'tish
          </button>
          @if (c.isBlocked) {
            <button class="btn-outline" (click)="unblock()">Blokdan chiqarish</button>
          } @else {
            <button class="btn-warn" (click)="openBlockModal()">Bloklash</button>
          }
          <button class="btn-danger" (click)="remove()">O'chirish</button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card">
          <h2 class="mb-2 font-semibold">VIP holati</h2>
          <div class="text-2xl font-bold">{{ c.isVip ? 'Yoqilgan' : "O'chiq" }}</div>
          @if (c.vipExpiresAt) {
            <div class="mb-2 text-xs text-slate-400">
              Tugash: {{ c.vipExpiresAt | date: 'short' }}
            </div>
          }
          <p class="mb-2 text-xs text-slate-500">
            VIP mijoz e'lonlari admin tekshiruvisiz to'g'ridan-to'g'ri kanalga chiqadi.
          </p>
          @if (c.isVip) {
            <button class="btn-outline" (click)="disableVip()">VIP o'chirish</button>
          } @else {
            <div class="flex flex-col gap-2">
              <input class="input" type="date" [(ngModel)]="vipExpiresAt" />
              <button class="btn-primary" (click)="enableVip()">VIP yoqish</button>
            </div>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">E'lonlar tarixi</h2>
          @for (p of c.jobPosts; track p.id) {
            <a
              class="flex justify-between border-b border-slate-100 py-2 text-sm hover:bg-slate-50"
              [routerLink]="['/jobs', p.id]"
            >
              <span class="font-mono">#{{ p.seq }}</span>
              <span>{{ p.salaryPerPerson }} so'm</span>
              <span class="text-slate-400">{{ statusLabel(p.status) }}</span>
            </a>
          } @empty {
            <p class="text-sm text-slate-400">E'lonlar yo'q</p>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">Harakatlar tarixi</h2>
          @for (a of c.activity; track $index) {
            <div class="border-b border-slate-100 py-2 text-sm">
              {{ a.action }} — {{ a.entity }} — {{ a.createdAt | date: 'short' }}
            </div>
          } @empty {
            <p class="text-sm text-slate-400">Harakatlar yo'q</p>
          }
        </div>
      </div>
    }

    @if (blockModalOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="card w-full max-w-md">
          <h2 class="mb-3 text-lg font-bold">Mijozni bloklash</h2>
          <label class="mb-1 block text-sm font-medium">Bloklash sababi</label>
          <textarea class="input mb-3" rows="3" [(ngModel)]="blockReasonInput" placeholder="Foydalanuvchiga ko'rsatiladi"></textarea>
          <div class="flex justify-end gap-2">
            <button class="btn-outline" (click)="closeBlockModal()">Bekor qilish</button>
            <button class="btn-warn" (click)="submitBlock()">Bloklash</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ClientDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  client = signal<ClientDetail | null>(null);
  readonly statusLabel = statusLabel;
  blockModalOpen = false;
  blockReasonInput = '';
  vipExpiresAt = '';

  private get id() {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api
      .get<ClientDetail>(`clients/${this.id}`)
      .subscribe((c) => this.client.set(c));
  }

  openBlockModal() {
    this.blockReasonInput = '';
    this.blockModalOpen = true;
  }

  closeBlockModal() {
    this.blockModalOpen = false;
  }

  submitBlock() {
    this.api
      .post(`clients/${this.id}/block`, { reason: this.blockReasonInput.trim() || undefined })
      .subscribe(() => {
        this.blockModalOpen = false;
        this.blockReasonInput = '';
        this.load();
      });
  }

  unblock() {
    this.api.post(`clients/${this.id}/unblock`).subscribe(() => this.load());
  }

  enableVip() {
    this.api
      .post(`clients/${this.id}/vip`, {
        enabled: true,
        expiresAt: this.vipExpiresAt || undefined,
      })
      .subscribe(() => {
        this.vipExpiresAt = '';
        this.load();
      });
  }

  disableVip() {
    this.api
      .post(`clients/${this.id}/vip`, { enabled: false })
      .subscribe(() => this.load());
  }

  reregister() {
    if (!confirm("Mijoz qayta ro'yxatdan o'tish jarayoniga yuborilsinmi?")) return;
    this.api.post(`clients/${this.id}/reregister`, {}).subscribe(() => this.load());
  }

  remove() {
    if (!confirm("Mijozni va uning e'lonlarini o'chirishni tasdiqlaysizmi?")) return;
    this.api.delete(`clients/${this.id}`).subscribe(() => {
      this.router.navigate(['/clients']);
    });
  }
}
