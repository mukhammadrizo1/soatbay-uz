import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Paginated } from '../core/api.service';
import { ImageViewerComponent } from '../shared/image-viewer.component';
import { statusLabel, paymentMethodLabel } from '../shared/status-labels';

interface JobDetail {
  id: string;
  seq: number;
  status: string;
  channelMessageId: number | null;
  startDate: string;
  startDay: string;
  workersNeeded: number;
  salaryPerPerson: number;
  meal: string;
  startTime: string;
  endTime: string | null;
  address: string;
  locationLat: number | null;
  locationLng: number | null;
  buses: string | null;
  description: string;
  contactPhone: string;
  serviceFee: number | null;
  createdByAdmin: boolean;
  employer: { id: string; seq: number; fullName: string; phone: string; telegramId: string | null };
  applications: {
    id: string;
    seq: number;
    status: string;
    paymentMethod: string | null;
    paymentCheckUrl: string | null;
    worker: { id: string; seq: number; fullName: string; phone: string };
  }[];
}

interface WorkerLite {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ImageViewerComponent],
  template: `
    <a class="text-sm text-brand" routerLink="/jobs">&larr; E'lonlar</a>
    @if (job(); as j) {
      <div class="mb-4 mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 class="text-2xl font-bold">E'lon #{{ j.seq }}</h1>
          <p class="text-slate-500">{{ statusLabel(j.status) }} · {{ j.startDate | date: 'medium' }}</p>
          @if (j.createdByAdmin) {
            <span class="badge bg-indigo-100 text-indigo-700">Admin yaratgan</span>
          }
          @if (j.channelMessageId) {
            <span class="badge ml-1 bg-slate-100 text-slate-600">Kanal #{{ j.channelMessageId }}</span>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          @if (j.channelMessageId) {
            @if (j.status === 'approved') {
              <button class="btn-warn" (click)="setClosed(true)">Yopish</button>
              <button class="btn-warn" (click)="setActive(false)">Nofaol qilish</button>
            }
            @if (j.status === 'closed') {
              <button class="btn-primary" (click)="setClosed(false)">Ochish</button>
            }
            @if (j.status === 'inactive') {
              <button class="btn-primary" (click)="setActive(true)">Faollashtirish</button>
            }
            <button class="btn-outline" (click)="republish()">Kanalga qayta yuborish</button>
          }
          <button class="btn-danger" (click)="remove()">O'chirish (DB + kanal)</button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card">
          <h2 class="mb-2 font-semibold">Ma'lumot</h2>
          <div class="text-sm">🫂 Ishchilar: {{ j.workersNeeded }}</div>
          <div class="text-sm">💰 Ish haqi: {{ j.salaryPerPerson }} so'm</div>
          <div class="text-sm">🍛 Ovqat: {{ j.meal }}</div>
          <div class="text-sm">⏰ {{ j.startTime }} - {{ j.endTime ?? 'ish tugaguncha' }}</div>
          <div class="text-sm">📍 {{ j.address }}</div>
          @if (j.buses) { <div class="text-sm">🚌 {{ j.buses }}</div> }
          <div class="text-sm">📞 {{ j.contactPhone }}</div>
          @if (j.serviceFee != null) {
            <div class="text-sm">🧾 Xizmat haqi: {{ j.serviceFee }} so'm</div>
          }
          <div class="mt-2 text-sm">{{ j.description }}</div>
          @if (j.locationLat != null && j.locationLng != null) {
            <a
              class="btn-outline mt-3 inline-flex"
              target="_blank"
              [href]="'https://maps.google.com/?q=' + j.locationLat + ',' + j.locationLng"
            >🗺 Xaritada ochish</a>
          }
        </div>

        <div class="card">
          <h2 class="mb-2 font-semibold">Mijoz (ish beruvchi)</h2>
          <a class="text-brand" [routerLink]="['/clients', j.employer.id]">
            #{{ j.employer.seq }} {{ j.employer.fullName }}
          </a>
          <div class="text-sm">{{ j.employer.phone }}</div>
          @if (j.employer.telegramId) {
            <div class="text-xs text-slate-400">Telegram: {{ j.employer.telegramId }}</div>
          }
        </div>
      </div>

      <div class="card mt-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-semibold">Ishchilar / arizalar ({{ j.applications.length }})</h2>
          <div class="flex flex-wrap gap-2">
            @if (j.status !== 'closed' && j.status !== 'inactive') {
              <button class="btn-primary" (click)="openAddWorker()">➕ Ishchi qo'shish</button>
            }
            @if (selectedIds().size > 0) {
              <button class="btn-danger" (click)="removeSelected()">
                Tanlanganlarni olib tashlash ({{ selectedIds().size }})
              </button>
            }
          </div>
        </div>

        <table class="table mt-3">
          <thead>
            <tr>
              <th class="w-8"></th>
              <th>Ariza</th>
              <th>Ishchi</th>
              <th>Telefon</th>
              <th>To'lov</th>
              <th>Chek</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            @for (a of j.applications; track a.id) {
              <tr>
                <td>
                  @if (a.status === 'approved') {
                    <input
                      type="checkbox"
                      [checked]="selectedIds().has(a.id)"
                      (change)="toggleSelect(a.id, $event)"
                    />
                  }
                </td>
                <td><a class="text-brand" [routerLink]="['/applications', a.id]">#{{ a.seq }}</a></td>
                <td><a class="text-brand" [routerLink]="['/workers', a.worker.id]">#{{ a.worker.seq }} {{ a.worker.fullName }}</a></td>
                <td>{{ a.worker.phone }}</td>
                <td>{{ paymentMethodLabel(a.paymentMethod) }}</td>
                <td>
                  @if (a.paymentCheckUrl) {
                    <app-image-viewer which="worker" [fileId]="a.paymentCheckUrl" label="🖼" filename="chek.jpg" />
                  } @else { — }
                </td>
                <td>{{ statusLabel(a.status) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-slate-400">Arizalar yo'q</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (addWorkerOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card max-h-[80vh] w-full max-w-lg overflow-y-auto">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold">Ishchi tanlash</h2>
            <button class="btn-outline px-2 py-1" (click)="closeAddWorker()">✕</button>
          </div>
          <div class="mb-3 flex gap-2">
            <input
              class="input flex-1"
              placeholder="ID, ism yoki telefon bo'yicha qidirish"
              [(ngModel)]="workerSearch"
              (keyup.enter)="searchWorkers()"
            />
            <button class="btn-outline" (click)="searchWorkers()">Qidirish</button>
          </div>
          @if (addError()) {
            <p class="mb-2 text-sm text-red-600">{{ addError() }}</p>
          }
          <div class="flex flex-col gap-1">
            @for (wr of workerResults(); track wr.id) {
              <button
                class="rounded border border-slate-200 p-2 text-left text-sm hover:bg-slate-50"
                [disabled]="addingWorker()"
                (click)="addWorker(wr)"
              >
                ➕ #{{ wr.seq }} {{ wr.fullName }} — {{ wr.phone }}
              </button>
            } @empty {
              <p class="text-sm text-slate-400">Ishchilar topilmadi</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class JobDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  job = signal<JobDetail | null>(null);
  selectedIds = signal<Set<string>>(new Set());
  readonly statusLabel = statusLabel;
  readonly paymentMethodLabel = paymentMethodLabel;
  addWorkerOpen = signal(false);
  workerSearch = '';
  workerResults = signal<WorkerLite[]>([]);
  addingWorker = signal(false);
  addError = signal('');

  private get id() {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<JobDetail>(`jobs/${this.id}`).subscribe((j) => {
      this.job.set(j);
      this.selectedIds.set(new Set());
    });
  }

  toggleSelect(id: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  removeSelected() {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    if (!confirm(`${ids.length} ta ishchini e'londan olib tashlaysizmi?`)) return;
    this.api
      .post(`jobs/${this.id}/applications/remove`, { applicationIds: ids })
      .subscribe(() => this.load());
  }

  openAddWorker() {
    this.addWorkerOpen.set(true);
    this.addError.set('');
    this.workerSearch = '';
    this.loadWorkers();
  }

  closeAddWorker() {
    this.addWorkerOpen.set(false);
    this.workerResults.set([]);
    this.addError.set('');
  }

  loadWorkers(search = '') {
    this.api
      .get<Paginated<WorkerLite>>('workers', { search, pageSize: 30 })
      .subscribe((d) => this.workerResults.set(d.items));
  }

  searchWorkers() {
    this.loadWorkers(this.workerSearch);
  }

  addWorker(wr: WorkerLite) {
    this.addingWorker.set(true);
    this.addError.set('');
    this.api.post(`jobs/${this.id}/workers`, { workerId: wr.id }).subscribe({
      next: () => {
        this.addingWorker.set(false);
        this.closeAddWorker();
        this.load();
      },
      error: (err) => {
        this.addingWorker.set(false);
        this.addError.set(err?.error?.message ?? "Ishchi qo'shishda xatolik");
      },
    });
  }

  setActive(active: boolean) {
    this.api.post(`jobs/${this.id}/active`, { active }).subscribe(() => this.load());
  }

  setClosed(closed: boolean) {
    this.api.post(`jobs/${this.id}/closed`, { closed }).subscribe(() => this.load());
  }

  republish() {
    this.api.post(`jobs/${this.id}/republish`, {}).subscribe(() => this.load());
  }

  remove() {
    if (!confirm("E'lonni o'chirishni tasdiqlaysizmi?")) return;
    this.api.delete(`jobs/${this.id}`).subscribe(() => {
      this.router.navigate(['/jobs']);
    });
  }
}
