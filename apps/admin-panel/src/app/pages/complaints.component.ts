import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { statusLabel } from '../shared/status-labels';

interface Attachment {
  type: string;
  fileId: string;
}

interface Complaint {
  id: string;
  seq: number;
  text: string | null;
  status: string;
  adminNote: string | null;
  attachments: Attachment[] | null;
  createdAt: string;
  worker: { id: string; seq: number; fullName: string; phone: string; telegramId: string | null };
}

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [DatePipe, FormsModule, PaginationComponent, ImageViewerComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-bold">Shikoyatlar</h1>
      <div class="flex gap-2">
        <select class="input max-w-[160px]" [(ngModel)]="status" (change)="load(1)">
          <option value="">Barchasi</option>
          <option value="new">Yangi</option>
          <option value="in-progress">Jarayonda</option>
          <option value="resolved">Yakunlangan</option>
        </select>
        <button class="btn-outline" (click)="load()">🔄</button>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      @for (c of data()?.items; track c.id) {
        <div class="card">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span class="font-mono">#{{ c.seq }} · {{ c.createdAt | date: 'short' }}</span>
            <span class="badge" [class]="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
          </div>
          <div class="text-sm">
            👤 #{{ c.worker.seq }} {{ c.worker.fullName }} — {{ c.worker.phone }}
          </div>
          @if (c.text) { <p class="mt-2 whitespace-pre-line text-sm">{{ c.text }}</p> }
          @if (c.attachments?.length) {
            <div class="mt-2 flex flex-wrap gap-2">
              @for (att of c.attachments; track att.fileId) {
                <app-image-viewer which="worker" [fileId]="att.fileId" label="🖼 Ilova" filename="ilova.jpg" />
              }
            </div>
          }
          @if (c.adminNote) {
            <div class="mt-2 rounded bg-slate-50 p-2 text-sm">
              <span class="font-medium">Admin javobi:</span> {{ c.adminNote }}
            </div>
          }

          <div class="mt-3 flex flex-wrap gap-2">
            @if (c.status === 'new') {
              <button class="btn-primary" (click)="setInProgress(c)">Ko'rib chiqishni boshlash</button>
            }
            @if (c.status !== 'resolved') {
              <button class="btn-outline" (click)="openResolve(c)">Yakunlash</button>
            }
          </div>
        </div>
      } @empty {
        <p class="text-slate-400">Shikoyatlar yo'q</p>
      }
    </div>
    <app-pagination
      [page]="data()?.page ?? 1"
      [totalPages]="data()?.totalPages ?? 1"
      (pageChange)="load($event)"
    />

    <!-- Yakunlash oynasi -->
    @if (resolveOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card w-full max-w-md">
          <h2 class="mb-3 text-lg font-bold">Shikoyatni yakunlash</h2>
          <label class="mb-1 block text-sm font-medium">Foydalanuvchiga javob</label>
          <textarea class="input mb-3" rows="4" [(ngModel)]="adminNote"></textarea>
          @if (error()) { <p class="mb-2 text-sm text-red-600">{{ error() }}</p> }
          <div class="flex justify-end gap-2">
            <button class="btn-outline" (click)="resolveOpen.set(false)">Bekor qilish</button>
            <button class="btn-primary" (click)="submitResolve()">Yakunlash</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ComplaintsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Complaint> | null>(null);
  status = '';
  resolveOpen = signal(false);
  resolveId = '';
  adminNote = '';
  error = signal('');
  readonly statusLabel = statusLabel;

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<Complaint>>('complaints', { status: this.status, page })
      .subscribe((d) => this.data.set(d));
  }

  statusClass(s: string): string {
    return s === 'new'
      ? 'bg-amber-100 text-amber-700'
      : s === 'in-progress'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-green-100 text-green-700';
  }

  setInProgress(c: Complaint) {
    this.api
      .patch(`complaints/${c.id}/status`, { status: 'in-progress' })
      .subscribe(() => this.load(this.data()?.page ?? 1));
  }

  openResolve(c: Complaint) {
    this.resolveId = c.id;
    this.adminNote = '';
    this.error.set('');
    this.resolveOpen.set(true);
  }

  submitResolve() {
    if (!this.adminNote.trim()) {
      this.error.set('Javob matni kiriting');
      return;
    }
    this.api
      .patch(`complaints/${this.resolveId}/status`, {
        status: 'resolved',
        adminNote: this.adminNote.trim(),
      })
      .subscribe({
        next: () => {
          this.resolveOpen.set(false);
          this.load(this.data()?.page ?? 1);
        },
        error: (e) => this.error.set(e?.error?.message ?? 'Xatolik'),
      });
  }
}
