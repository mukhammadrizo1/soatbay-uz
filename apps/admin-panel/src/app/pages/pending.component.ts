import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { statusLabel } from '../shared/status-labels';

type Tab = 'posts' | 'topups' | 'registrations' | 'applications';

interface PendingUser {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
  telegramId: string | null;
  age?: number | null;
  passportPhotoUrl?: string | null;
  balance?: number;
}

interface PendingJobPost {
  id: string;
  seq: number;
  status: string;
  startDate: string;
  startDay: string;
  workersNeeded: number;
  salaryPerPerson: number;
  meal: string;
  startTime: string;
  endTime: string | null;
  address: string;
  locationLat?: number | null;
  locationLng?: number | null;
  buses?: string | null;
  description?: string;
  contactPhone?: string;
  serviceFee?: number | null;
  employer?: { id: string; seq: number; fullName: string; phone: string } | null;
}

interface PendingApplication {
  id: string;
  seq: number;
  status: string;
  paymentMethod: string | null;
  paymentCheckUrl: string | null;
  distanceScreenshotUrl: string | null;
  feeCharged: number | null;
  worker?: PendingUser | null;
  jobPost?: PendingJobPost | null;
}

interface PendingItem {
  id: string;
  seq: number;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
  employer?: PendingUser | null;
  worker?: PendingUser | null;
  jobPost?: PendingJobPost | null;
  application?: PendingApplication | null;
}

interface ModalState {
  open: boolean;
  itemId: string;
  action: string;
  label: string;
  message: string;
  withFee?: boolean;
  fee?: number | null;
}

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [DatePipe, FormsModule, PaginationComponent, ImageViewerComponent, RouterLink],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">In pending</h1>
      <button class="btn-outline" (click)="load()">🔄 Yangilash</button>
    </div>

    <div class="mb-4 flex gap-2 border-b border-slate-200">
      @for (t of tabs; track t.key) {
        <button
          class="-mb-px border-b-2 px-4 py-2 text-sm font-medium"
          [class]="tab() === t.key ? 'border-brand text-brand' : 'border-transparent text-slate-500'"
          (click)="switchTab(t.key)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    <div class="flex flex-col gap-3">
      @for (item of data()?.items; track item.id) {
        <div class="card">
          <div class="mb-2 flex items-start justify-between gap-2">
            <span class="text-sm text-slate-500 font-mono">#{{ item.seq }} · {{ item.createdAt | date: 'short' }}</span>
            <button
              class="btn-outline px-2 py-1 text-sm"
              title="Batafsil ma'lumot"
              (click)="openDetail(item)"
            >
              ℹ️
            </button>
          </div>
          @if (pendingPerson(item); as u) {
            <div class="text-sm">👤 #{{ u.seq }} {{ u.fullName }} — {{ u.phone }}</div>
          }
          @if (item.jobPost) {
            <div class="text-sm">📢 #{{ item.jobPost.seq }} · {{ item.jobPost.salaryPerPerson }} so'm · {{ item.jobPost.address }}</div>
          }
          @if (item.payload && item.payload['amount']) {
            <div class="text-sm">💰 Summa: {{ item.payload['amount'] }} so'm</div>
          }

          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn-primary" (click)="approve(item)">Tasdiqlash</button>
            <button class="btn-warn" (click)="openModal(item.id, 'warn', 'Ogohlantirish')">Ogohlantirish</button>
            @if (tab() === 'posts' || tab() === 'applications' || tab() === 'registrations' || tab() === 'topups') {
              <button class="btn-danger" (click)="openModal(item.id, 'block', 'Bloklash')">Bloklash</button>
            }
            @if (tab() !== 'registrations') {
              <button class="btn-outline" (click)="openModal(item.id, 'cancel', 'Bekor qilish')">Bekor qilish</button>
            }
          </div>
        </div>
      } @empty {
        <p class="text-slate-400">So'rovlar yo'q</p>
      }
    </div>
    <app-pagination
      [page]="data()?.page ?? 1"
      [totalPages]="data()?.totalPages ?? 1"
      [total]="data()?.total ?? 0"
      [pageSize]="data()?.pageSize ?? 0"
      (pageChange)="load($event)"
    />

    <!-- Batafsil ma'lumot modali -->
    @if (detailItem(); as d) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
          <div class="mb-4 flex items-start justify-between gap-2">
            <h2 class="text-lg font-bold">So'rov #{{ d.seq }}</h2>
            <button class="btn-outline px-2 py-1" (click)="closeDetail()">✕</button>
          </div>

          <div class="mb-3 text-sm text-slate-500">{{ d.createdAt | date: 'medium' }}</div>

          @if (pendingPerson(d); as u) {
            <div class="mb-4 rounded border border-slate-200 p-3">
              <h3 class="mb-2 font-semibold">Foydalanuvchi</h3>
              <div class="text-sm">#{{ u.seq }} {{ u.fullName }}</div>
              <div class="text-sm">📞 {{ u.phone }}</div>
              @if (u.telegramId) {
                <div class="text-xs text-slate-400">Telegram: {{ u.telegramId }}</div>
              }
              @if (u.age != null) {
                <div class="text-sm">🎂 Yosh: {{ u.age }}</div>
              }
              @if (u.balance != null) {
                <div class="text-sm">💳 Balans: {{ u.balance }} so'm</div>
              }
              @if (u.passportPhotoUrl) {
                <div class="mt-2">
                  <app-image-viewer
                    which="worker"
                    [fileId]="u.passportPhotoUrl"
                    label="🪪 Pasport"
                    filename="passport.jpg"
                  />
                </div>
              }
              <a class="mt-2 inline-block text-sm text-brand" [routerLink]="userLink(d)">Profilga o'tish →</a>
            </div>
          }

          @if (d.jobPost; as jp) {
            <div class="mb-4 rounded border border-slate-200 p-3">
              <h3 class="mb-2 font-semibold">E'lon #{{ jp.seq }}</h3>
              <div class="text-sm">{{ statusLabel(jp.status) }} · {{ jp.startDate | date: 'mediumDate' }}</div>
              <div class="text-sm">🫂 Ishchilar: {{ jp.workersNeeded }}</div>
              <div class="text-sm">💰 Ish haqi: {{ jp.salaryPerPerson }} so'm</div>
              <div class="text-sm">🍛 Ovqat: {{ jp.meal }}</div>
              <div class="text-sm">⏰ {{ jp.startTime }} — {{ jp.endTime ?? 'ish tugaguncha' }}</div>
              <div class="text-sm">📍 {{ jp.address }}</div>
              @if (jp.buses) { <div class="text-sm">🚌 {{ jp.buses }}</div> }
              @if (jp.contactPhone) { <div class="text-sm">📞 {{ jp.contactPhone }}</div> }
              @if (jp.serviceFee != null) {
                <div class="text-sm">🧾 Xizmat haqi: {{ jp.serviceFee }} so'm</div>
              }
              @if (jp.description) {
                <div class="mt-2 text-sm">{{ jp.description }}</div>
              }
              @if (jp.employer) {
                <div class="mt-2 text-sm">
                  Mijoz:
                  <a class="text-brand" [routerLink]="['/clients', jp.employer.id]">
                    #{{ jp.employer.seq }} {{ jp.employer.fullName }}
                  </a>
                  — {{ jp.employer.phone }}
                </div>
              }
              @if (jp.locationLat != null && jp.locationLng != null) {
                <a
                  class="btn-outline mt-2 inline-flex text-sm"
                  target="_blank"
                  [href]="'https://maps.google.com/?q=' + jp.locationLat + ',' + jp.locationLng"
                >🗺 Xaritada ochish</a>
              }
              <a class="mt-2 inline-block text-sm text-brand" [routerLink]="['/jobs', jp.id]">E'lon sahifasi →</a>
            </div>
          }

          @if (d.application; as app) {
            <div class="mb-4 rounded border border-slate-200 p-3">
              <h3 class="mb-2 font-semibold">Ariza #{{ app.seq }}</h3>
              <div class="text-sm">Holat: {{ statusLabel(app.status) }}</div>
              @if (app.paymentMethod) {
                <div class="text-sm">To'lov: {{ app.paymentMethod }}</div>
              }
              @if (app.feeCharged != null) {
                <div class="text-sm">Xizmat haqi: {{ app.feeCharged }} so'm</div>
              }
              @if (app.worker) {
                <div class="mt-2 text-sm">
                  Ishchi:
                  <a class="text-brand" [routerLink]="['/workers', app.worker.id]">
                    #{{ app.worker.seq }} {{ app.worker.fullName }}
                  </a>
                  — {{ app.worker.phone }}
                </div>
              }
              @if (app.jobPost) {
                <div class="text-sm">
                  E'lon:
                  <a class="text-brand" [routerLink]="['/jobs', app.jobPost.id]">#{{ app.jobPost.seq }}</a>
                  — {{ app.jobPost.address }}
                </div>
              }
              @if (app.distanceScreenshotUrl) {
                <div class="mt-2">
                  <app-image-viewer
                    which="worker"
                    [fileId]="app.distanceScreenshotUrl"
                    label="📍 Masofa skrinshoti"
                    filename="distance.jpg"
                  />
                </div>
              }
              @if (app.paymentCheckUrl || checkFileId(d)) {
                <div class="mt-2">
                  <app-image-viewer
                    which="worker"
                    [fileId]="app.paymentCheckUrl ?? checkFileId(d)!"
                    label="🖼 To'lov cheki"
                    filename="chek.jpg"
                  />
                </div>
              }
              <a class="mt-2 inline-block text-sm text-brand" [routerLink]="['/applications', app.id]">Ariza sahifasi →</a>
            </div>
          }

          @if (d.payload && d.payload['amount']) {
            <div class="mb-4 text-sm">💰 Summa: {{ d.payload['amount'] }} so'm</div>
          }
          @if (checkFileId(d) && !d.application?.paymentCheckUrl) {
            <div class="mb-4">
              <app-image-viewer
                which="worker"
                [fileId]="checkFileId(d)"
                label="🖼 Chekni ko'rish"
                filename="chek.jpg"
              />
            </div>
          }

          <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button class="btn-primary" (click)="approve(d)">Tasdiqlash</button>
            <button class="btn-warn" (click)="openModalFromDetail(d.id, 'warn', 'Ogohlantirish')">Ogohlantirish</button>
            @if (tab() !== 'registrations') {
              <button class="btn-outline" (click)="openModalFromDetail(d.id, 'cancel', 'Bekor qilish')">Bekor qilish</button>
            }
            <button class="btn-danger" (click)="openModalFromDetail(d.id, 'block', 'Bloklash')">Bloklash</button>
          </div>
        </div>
      </div>
    }

    <!-- Amal oynasi -->
    @if (modal().open) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
        <div class="card w-full max-w-md">
          <h2 class="mb-3 text-lg font-bold">{{ modal().label }}</h2>
          @if (modal().withFee) {
            <label class="mb-1 block text-sm font-medium">Xizmat haqi (ixtiyoriy)</label>
            <input class="input mb-3" type="number" [(ngModel)]="modal().fee" placeholder="Bo'sh qoldirsangiz avtomatik hisoblanadi" />
          } @else {
            <label class="mb-1 block text-sm font-medium">
              {{ modal().action === 'block' ? 'Bloklash sababi (ixtiyoriy)' : 'Xabar (ixtiyoriy)' }}
            </label>
            <textarea class="input mb-3" rows="3" [(ngModel)]="modal().message"></textarea>
          }
          <div class="flex justify-end gap-2">
            <button class="btn-outline" (click)="closeModal()">Bekor qilish</button>
            <button class="btn-primary" (click)="submitModal()">Yuborish</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PendingComponent implements OnInit {
  private api = inject(ApiService);

  tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: "E'lon so'rovlari" },
    { key: 'topups', label: "Hisob to'ldirish" },
    { key: 'registrations', label: "Ro'yxatdan o'tish" },
    { key: 'applications', label: 'Ishga yozilish' },
  ];

  tab = signal<Tab>('posts');
  data = signal<Paginated<PendingItem> | null>(null);
  detailItem = signal<PendingItem | null>(null);
  modal = signal<ModalState>({ open: false, itemId: '', action: '', label: '', message: '' });
  readonly statusLabel = statusLabel;

  checkFileId(item: PendingItem): string | null {
    const fromPayload = item.payload?.['checkPhotoUrl'];
    if (typeof fromPayload === 'string' && fromPayload.length > 0) return fromPayload;
    return null;
  }

  pendingPerson(item: PendingItem): PendingUser | null {
    if (this.tab() === 'posts') return item.employer ?? null;
    return item.worker ?? null;
  }

  userLink(item: PendingItem): string[] {
    if (this.tab() === 'posts') return ['/clients', item.employer!.id];
    return ['/workers', item.worker!.id];
  }

  ngOnInit() {
    this.load();
  }

  switchTab(t: Tab) {
    this.tab.set(t);
    this.closeDetail();
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<PendingItem>>(`pending/${this.tab()}`, this.api.listQuery(page))
      .subscribe((d) => this.data.set(d));
  }

  openDetail(item: PendingItem) {
    this.api.get<PendingItem>(`pending/${this.tab()}/${item.id}`).subscribe((d) => {
      this.detailItem.set(d);
    });
  }

  closeDetail() {
    this.detailItem.set(null);
  }

  approve(item: PendingItem) {
    if (this.tab() === 'posts') {
      this.closeDetail();
      this.openModal(item.id, 'approve', "E'lonni tasdiqlash", true);
      return;
    }
    this.api
      .post(`pending/${this.tab()}/${item.id}/approve`, {})
      .subscribe(() => {
        this.load();
        this.closeDetail();
      });
  }

  openModalFromDetail(itemId: string, action: string, label: string, withFee = false) {
    this.closeDetail();
    this.openModal(itemId, action, label, withFee);
  }

  openModal(itemId: string, action: string, label: string, withFee = false) {
    this.modal.set({ open: true, itemId, action, label, message: '', withFee, fee: null });
  }

  closeModal() {
    this.modal.update((m) => ({ ...m, open: false }));
  }

  submitModal() {
    const m = this.modal();
    const body = m.withFee
      ? { serviceFee: m.fee ? Number(m.fee) : null }
      : { message: m.message };
    this.api
      .post(`pending/${this.tab()}/${m.itemId}/${m.action}`, body)
      .subscribe(() => {
        this.closeModal();
        this.load();
      });
  }
}
