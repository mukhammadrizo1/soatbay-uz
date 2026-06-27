import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { UserMessageComponent } from '../shared/user-message.component';
import { statusLabel } from '../shared/status-labels';

interface WorkerDetail {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
  telegramId: string | null;
  age: number | null;
  passportPhotoUrl: string | null;
  balance: number;
  isVip: boolean;
  vipExpiresAt: string | null;
  isBlocked: boolean;
  blockReason: string | null;
  balanceTransactions: {
    id: string;
    amount: number;
    type: string;
    balanceAfter: number;
    createdAt: string;
    depositId: string | null;
    depositSeq: number | null;
    applicationId: string | null;
    applicationSeq: number | null;
  }[];
  applications: {
    id: string;
    seq: number;
    status: string;
    jobDate: string;
    jobPost: { id: string; seq: number; salaryPerPerson: number };
  }[];
}

@Component({
  selector: 'app-worker-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    ImageViewerComponent,
    UserMessageComponent,
  ],
  template: `
    <a class="text-sm text-brand" routerLink="/workers">&larr; Ishchilar</a>
    @if (worker(); as w) {
      <div class="mb-4 mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">#{{ w.seq }} · {{ w.fullName }}</h1>
          <p class="text-slate-500">{{ w.phone }} · {{ w.age ?? '-' }} yosh</p>
          @if (w.isBlocked && w.blockReason) {
            <p class="mt-1 text-sm text-red-600">Blok sababi: {{ w.blockReason }}</p>
          }
          @if (w.telegramId) {
            <p class="text-xs text-slate-400">Telegram: {{ w.telegramId }}</p>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          <app-user-message [userId]="w.id" />
          @if (w.isBlocked) {
            <button class="btn-outline" (click)="unblock()">Blokdan chiqarish</button>
          } @else {
            <button class="btn-warn" (click)="openBlockModal()">Bloklash</button>
          }
          <button class="btn-outline" (click)="openEdit(w)">Tahrirlash</button>
          <button class="btn-outline" (click)="reregister()" [disabled]="!w.telegramId">
            Qayta ro'yxatdan o'tish
          </button>
          <button class="btn-danger" (click)="confirmDelete.set(true)">O'chirish</button>
        </div>
      </div>

      <div class="mb-4 grid gap-4 md:grid-cols-3">
        <div class="card">
          <div class="text-sm text-slate-500">Hisob</div>
          <div class="mb-2 text-2xl font-bold">{{ w.balance }} so'm</div>
          <div class="flex flex-col gap-2">
            <input class="input" type="number" [(ngModel)]="balanceDelta" placeholder="± summa" />
            <input class="input" [(ngModel)]="balanceReason" placeholder="Sabab (ixtiyoriy)" />
            <button class="btn-primary" (click)="adjustBalance()">Saqlash</button>
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-slate-500">VIP holati</div>
          <div class="text-2xl font-bold">{{ w.isVip ? 'Yoqilgan' : "O'chiq" }}</div>
          @if (w.vipExpiresAt) {
            <div class="mb-2 text-xs text-slate-400">
              Tugash: {{ w.vipExpiresAt | date: 'short' }}
            </div>
          }
          @if (w.isVip) {
            <button class="btn-outline" (click)="disableVip()">VIP o'chirish</button>
          } @else {
            <div class="flex flex-col gap-2">
              <input class="input" type="date" [(ngModel)]="vipExpiresAt" />
              <button class="btn-primary" (click)="enableVip()">VIP yoqish</button>
            </div>
          }
        </div>
        <div class="card">
          <div class="mb-2 text-sm text-slate-500">Pasport</div>
          @if (w.passportPhotoUrl) {
            <app-image-viewer
              which="worker"
              [fileId]="w.passportPhotoUrl"
              label="🖼 Pasportni ko'rish"
              filename="passport.jpg"
            />
          } @else {
            <div class="text-2xl font-bold">Yo'q</div>
          }
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card">
          <h2 class="mb-2 font-semibold">Hisob harakatlari</h2>
          @for (t of w.balanceTransactions; track t.id) {
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 py-2 text-sm">
              <div class="flex min-w-[5rem] items-center gap-2">
                @if (t.depositId && t.depositSeq != null) {
                  <a class="font-mono text-brand" [routerLink]="['/deposits', t.depositId]">
                    #{{ t.depositSeq }}
                  </a>
                } @else if (t.applicationId && t.applicationSeq != null) {
                  <a class="font-mono text-brand" [routerLink]="['/applications', t.applicationId]">
                    #{{ t.applicationSeq }}
                  </a>
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </div>
              <span [class]="t.amount >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ t.amount >= 0 ? '+' : '' }}{{ t.amount }}
              </span>
              <span class="text-slate-400">{{ t.type }}</span>
              <span>{{ t.balanceAfter }} so'm</span>
              <span class="text-slate-400">{{ t.createdAt | date: 'short' }}</span>
            </div>
          } @empty {
            <p class="text-sm text-slate-400">Harakatlar yo'q</p>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">Ish arizalari</h2>
          @for (a of w.applications; track a.id) {
            <div class="flex justify-between border-b border-slate-100 py-2 text-sm">
              <a class="font-mono text-brand" [routerLink]="['/applications', a.id]">#{{ a.seq }}</a>
              <a class="text-brand" [routerLink]="['/jobs', a.jobPost.id]">E'lon #{{ a.jobPost.seq }}</a>
              <span>{{ a.jobPost.salaryPerPerson }} so'm</span>
              <span class="text-slate-400">{{ statusLabel(a.status) }}</span>
            </div>
          } @empty {
            <p class="text-sm text-slate-400">Arizalar yo'q</p>
          }
        </div>
      </div>

      <!-- Tahrirlash oynasi -->
      @if (editOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="card w-full max-w-md">
            <h2 class="mb-3 text-lg font-bold">Ishchini tahrirlash</h2>
            <div class="flex flex-col gap-3">
              <input class="input" [(ngModel)]="edit.fullName" placeholder="F.I.O." />
              <input class="input" [(ngModel)]="edit.phone" placeholder="Telefon" />
              <input class="input" type="number" [(ngModel)]="edit.age" placeholder="Yosh" />
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button class="btn-outline" (click)="editOpen.set(false)">Bekor qilish</button>
              <button class="btn-primary" (click)="saveEdit()">Saqlash</button>
            </div>
          </div>
        </div>
      }

      <!-- Bloklash oynasi -->
      @if (blockModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="card w-full max-w-md">
            <h2 class="mb-3 text-lg font-bold">Ishchini bloklash</h2>
            <label class="mb-1 block text-sm font-medium">Bloklash sababi</label>
            <textarea class="input mb-3" rows="3" [(ngModel)]="blockReasonInput" placeholder="Foydalanuvchiga ko'rsatiladi"></textarea>
            <div class="flex justify-end gap-2">
              <button class="btn-outline" (click)="blockModalOpen.set(false)">Bekor qilish</button>
              <button class="btn-warn" (click)="submitBlock()">Bloklash</button>
            </div>
          </div>
        </div>
      }

      <!-- O'chirish tasdiqlash oynasi -->
      @if (confirmDelete()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="card w-full max-w-sm">
            <h2 class="mb-2 text-lg font-bold">Ishonchingiz komilmi?</h2>
            <p class="mb-4 text-sm text-slate-500">Bu ishchini o'chirish qaytarib bo'lmaydi.</p>
            <div class="flex justify-end gap-2">
              <button class="btn-outline" (click)="confirmDelete.set(false)">Bekor qilish</button>
              <button class="btn-danger" (click)="remove()">O'chirish</button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class WorkerDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  worker = signal<WorkerDetail | null>(null);
  readonly statusLabel = statusLabel;
  editOpen = signal(false);
  blockModalOpen = signal(false);
  confirmDelete = signal(false);
  blockReasonInput = '';
  balanceDelta: number | null = null;
  balanceReason = '';
  vipExpiresAt = '';
  edit: { fullName?: string; phone?: string; age?: number } = {};

  ngOnInit() {
    this.load();
  }

  private get id() {
    return this.route.snapshot.paramMap.get('id')!;
  }

  load() {
    this.api
      .get<WorkerDetail>(`workers/${this.id}`)
      .subscribe((w) => this.worker.set(w));
  }

  openEdit(w: WorkerDetail) {
    this.edit = { fullName: w.fullName, phone: w.phone, age: w.age ?? undefined };
    this.editOpen.set(true);
  }

  saveEdit() {
    this.api.patch(`workers/${this.id}`, this.edit).subscribe(() => {
      this.editOpen.set(false);
      this.load();
    });
  }

  adjustBalance() {
    if (this.balanceDelta == null) return;
    this.api
      .post(`workers/${this.id}/balance`, {
        amount: this.balanceDelta,
        reason: this.balanceReason || undefined,
      })
      .subscribe(() => {
        this.balanceDelta = null;
        this.balanceReason = '';
        this.load();
      });
  }

  enableVip() {
    this.api
      .post(`workers/${this.id}/vip`, {
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
      .post(`workers/${this.id}/vip`, { enabled: false })
      .subscribe(() => this.load());
  }

  openBlockModal() {
    this.blockReasonInput = '';
    this.blockModalOpen.set(true);
  }

  submitBlock() {
    this.api
      .post(`workers/${this.id}/block`, { reason: this.blockReasonInput.trim() || undefined })
      .subscribe(() => {
        this.blockModalOpen.set(false);
        this.blockReasonInput = '';
        this.load();
      });
  }

  unblock() {
    this.api.post(`workers/${this.id}/unblock`).subscribe(() => this.load());
  }

  reregister() {
    if (!confirm("Ishchi qayta ro'yxatdan o'tish jarayoniga yuborilsinmi?")) return;
    this.api.post(`workers/${this.id}/reregister`, {}).subscribe(() => this.load());
  }

  remove() {
    this.api.delete(`workers/${this.id}`).subscribe(() => {
      this.confirmDelete.set(false);
      this.router.navigate(['/workers']);
    });
  }
}
