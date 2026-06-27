import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { statusLabel } from '../shared/status-labels';

interface DepositDetail {
  id: string;
  seq: number;
  amount: number;
  status: string;
  checkPhotoUrl: string | null;
  createdAt: string;
  worker: { id: string; seq: number; fullName: string; phone: string; telegramId: string | null };
}

@Component({
  selector: 'app-deposit-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ImageViewerComponent],
  template: `
    <a class="text-sm text-brand" routerLink="/deposits">&larr; Depozitlar</a>
    @if (deposit(); as d) {
      <h1 class="mb-1 mt-2 text-2xl font-bold">Depozit #{{ d.seq }}</h1>
      <p class="mb-4 text-slate-500">{{ d.createdAt | date: 'medium' }} · {{ statusLabel(d.status) }}</p>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card">
          <h2 class="mb-2 font-semibold">Ma'lumot</h2>
          <div class="text-sm">💰 Summa: {{ d.amount }} so'm</div>
          <div class="mt-2 text-sm">
            👤
            <a class="text-brand" [routerLink]="['/workers', d.worker.id]">
              #{{ d.worker.seq }} {{ d.worker.fullName }}
            </a>
            — {{ d.worker.phone }}
          </div>
          @if (d.worker.telegramId) {
            <div class="text-xs text-slate-400">Telegram: {{ d.worker.telegramId }}</div>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">Chek</h2>
          @if (d.checkPhotoUrl) {
            <app-image-viewer
              which="worker"
              [fileId]="d.checkPhotoUrl"
              label="🖼 Chekni ko'rish"
              filename="chek.jpg"
            />
          } @else {
            <p class="text-sm text-slate-400">Chek yo'q</p>
          }
        </div>
      </div>
    }
  `,
})
export class DepositDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  deposit = signal<DepositDetail | null>(null);
  readonly statusLabel = statusLabel;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api
      .get<DepositDetail>(`deposits/${id}`)
      .subscribe((d) => this.deposit.set(d));
  }
}
