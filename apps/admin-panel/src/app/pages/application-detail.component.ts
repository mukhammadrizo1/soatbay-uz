import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { statusLabel } from '../shared/status-labels';

interface ApplicationDetail {
  id: string;
  seq: number;
  status: string;
  jobDate: string;
  paymentMethod: string | null;
  paymentCheckUrl: string | null;
  distanceScreenshotUrl: string | null;
  feeCharged: number | null;
  createdAt: string;
  worker: { id: string; seq: number; fullName: string; phone: string; telegramId: string | null };
  jobPost: {
    id: string;
    seq: number;
    address: string;
    salaryPerPerson: number;
    employer: { id: string; seq: number; fullName: string };
  };
}

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ImageViewerComponent],
  template: `
    <a class="text-sm text-brand" routerLink="/applications">&larr; Ishga yozilishlar</a>
    @if (app(); as a) {
      <h1 class="mb-1 mt-2 text-2xl font-bold">Ariza #{{ a.seq }}</h1>
      <p class="mb-4 text-slate-500">{{ a.createdAt | date: 'medium' }} · {{ statusLabel(a.status) }}</p>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card">
          <h2 class="mb-2 font-semibold">Ishchi</h2>
          <a class="text-brand" [routerLink]="['/workers', a.worker.id]">
            #{{ a.worker.seq }} {{ a.worker.fullName }}
          </a>
          <div class="text-sm">{{ a.worker.phone }}</div>
          @if (a.worker.telegramId) {
            <div class="text-xs text-slate-400">Telegram: {{ a.worker.telegramId }}</div>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">E'lon</h2>
          <a class="text-brand" [routerLink]="['/jobs', a.jobPost.id]">#{{ a.jobPost.seq }}</a>
          <div class="text-sm">{{ a.jobPost.address }}</div>
          <div class="text-sm">{{ a.jobPost.salaryPerPerson }} so'm</div>
          <div class="mt-1 text-sm">
            Mijoz:
            <a class="text-brand" [routerLink]="['/clients', a.jobPost.employer.id]">
              #{{ a.jobPost.employer.seq }} {{ a.jobPost.employer.fullName }}
            </a>
          </div>
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">To'lov</h2>
          <div class="text-sm">Usul: {{ a.paymentMethod ?? '—' }}</div>
          <div class="text-sm">Olingan haq: {{ a.feeCharged ?? 0 }} so'm</div>
          <div class="text-sm">Ish sanasi: {{ a.jobDate | date: 'shortDate' }}</div>
          @if (a.paymentCheckUrl) {
            <div class="mt-2">
              <app-image-viewer which="worker" [fileId]="a.paymentCheckUrl" label="🖼 To'lov cheki" filename="chek.jpg" />
            </div>
          }
        </div>
        <div class="card">
          <h2 class="mb-2 font-semibold">Lokatsiya skrinshoti</h2>
          @if (a.distanceScreenshotUrl) {
            <app-image-viewer which="worker" [fileId]="a.distanceScreenshotUrl" label="🖼 Skrinshot" filename="screenshot.jpg" />
          } @else {
            <p class="text-sm text-slate-400">Yo'q</p>
          }
        </div>
      </div>
    }
  `,
})
export class ApplicationDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  app = signal<ApplicationDetail | null>(null);
  readonly statusLabel = statusLabel;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api
      .get<ApplicationDetail>(`applications/${id}`)
      .subscribe((a) => this.app.set(a));
  }
}
