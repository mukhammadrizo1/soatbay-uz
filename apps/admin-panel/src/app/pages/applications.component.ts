import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';
import { statusLabel } from '../shared/status-labels';

interface Application {
  id: string;
  seq: number;
  status: string;
  jobDate: string;
  worker: { fullName: string; phone: string };
  jobPost: { id: string; seq: number; salaryPerPerson: number; address: string };
}

interface ClientLite {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
}

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PaginationComponent],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Ishga yozilishlar</h1>
      <button class="btn-primary" (click)="openCreate()">E'lon yaratish</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ishchi</th>
            <th>Telefon</th>
            <th>E'lon</th>
            <th>Manzil</th>
            <th>Holat</th>
            <th>Sana</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (a of data()?.items; track a.id) {
            <tr>
              <td class="font-mono">#{{ a.seq }}</td>
              <td class="cell-truncate" [title]="a.worker.fullName">{{ a.worker.fullName }}</td>
              <td class="cell-truncate" [title]="a.worker.phone">{{ a.worker.phone }}</td>
              <td>#{{ a.jobPost.seq }}</td>
              <td class="cell-truncate-md" [title]="a.jobPost.address">{{ a.jobPost.address }}</td>
              <td>{{ statusLabel(a.status) }}</td>
              <td>{{ a.jobDate | date: 'shortDate' }}</td>
              <td>
                <a class="btn-outline" [routerLink]="['/applications', a.id]">Batafsil</a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-pagination
      [page]="data()?.page ?? 1"
      [totalPages]="data()?.totalPages ?? 1"
      [total]="data()?.total ?? 0"
      [pageSize]="data()?.pageSize ?? 0"
      (pageChange)="load($event)"
    />

    <!-- E'lon yaratish oynasi -->
    @if (createOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
        <div class="card w-full max-w-lg">
          <h2 class="mb-3 text-lg font-bold">Yangi e'lon (kanalga joylanadi)</h2>

          <div class="mb-3">
            <label class="mb-1 block text-sm font-medium">Mijoz</label>
            <div class="flex gap-2">
              <input
                class="input"
                placeholder="Mijoz qidirish (ID/ism/telefon)"
                [(ngModel)]="clientSearch"
                (keyup.enter)="searchClients()"
              />
              <button class="btn-outline" (click)="searchClients()">Qidirish</button>
            </div>
            @if (selectedClient(); as sc) {
              <div class="mt-2 rounded bg-green-50 p-2 text-sm">
                ✅ #{{ sc.seq }} {{ sc.fullName }} — {{ sc.phone }}
                <button class="ml-2 text-xs text-red-600" (click)="selectedClient.set(null)">x</button>
              </div>
            } @else {
              @for (c of clientResults(); track c.id) {
                <button
                  class="mt-1 block w-full rounded border border-slate-200 p-2 text-left text-sm hover:bg-slate-50"
                  (click)="selectedClient.set(c)"
                >
                  #{{ c.seq }} {{ c.fullName }} — {{ c.phone }}
                </button>
              }
              <div class="mt-2 text-xs text-slate-500">Yoki yangi mijoz:</div>
              <div class="mt-1 flex gap-2">
                <input class="input" placeholder="Yangi mijoz ismi" [(ngModel)]="form.clientName" />
                <input class="input" placeholder="Telefon" [(ngModel)]="form.clientPhone" />
              </div>
            }
          </div>

          <div class="grid grid-cols-2 gap-2">
            <select class="input" [(ngModel)]="form.startDay">
              <option value="today">Bugun</option>
              <option value="tomorrow">Ertaga</option>
            </select>
            <select class="input" [(ngModel)]="form.meal">
              <option value="yo'q">Ovqat yo'q</option>
              <option value="1 mahal">1 mahal</option>
              <option value="2 mahal">2 mahal</option>
            </select>
            <input class="input" type="number" placeholder="Ishchilar soni" [(ngModel)]="form.workersNeeded" />
            <input class="input" type="number" placeholder="Ish haqi" [(ngModel)]="form.salaryPerPerson" />
            <input class="input" placeholder="Boshlanish vaqti 08:00" [(ngModel)]="form.startTime" />
            <input class="input" placeholder="Tugash vaqti (ixtiyoriy)" [(ngModel)]="form.endTime" />
            <input class="input col-span-2" placeholder="Manzil" [(ngModel)]="form.address" />
            <input class="input" placeholder="Lat (ixtiyoriy)" [(ngModel)]="form.lat" />
            <input class="input" placeholder="Lng (ixtiyoriy)" [(ngModel)]="form.lng" />
            <input class="input col-span-2" placeholder="Avtobuslar (ixtiyoriy)" [(ngModel)]="form.buses" />
            <textarea class="input col-span-2" rows="2" placeholder="Tavsif" [(ngModel)]="form.description"></textarea>
            <input class="input col-span-2" placeholder="Aloqa telefoni" [(ngModel)]="form.contactPhone" />
          </div>

          @if (error()) {
            <p class="mt-2 text-sm text-red-600">{{ error() }}</p>
          }
          <div class="mt-4 flex justify-end gap-2">
            <button class="btn-outline" (click)="createOpen.set(false)">Bekor qilish</button>
            <button class="btn-primary" (click)="submitCreate()">Yaratish</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ApplicationsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Application> | null>(null);
  readonly statusLabel = statusLabel;

  createOpen = signal(false);
  clientSearch = '';
  clientResults = signal<ClientLite[]>([]);
  selectedClient = signal<ClientLite | null>(null);
  error = signal('');
  form: Record<string, string | number> = this.emptyForm();

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<Application>>('applications', this.api.listQuery(page))
      .subscribe((d) => this.data.set(d));
  }

  openCreate() {
    this.form = this.emptyForm();
    this.selectedClient.set(null);
    this.clientResults.set([]);
    this.clientSearch = '';
    this.error.set('');
    this.createOpen.set(true);
  }

  searchClients() {
    this.api
      .get<Paginated<ClientLite>>('clients', this.api.listQuery(1, { search: this.clientSearch }))
      .subscribe((d) => this.clientResults.set(d.items));
  }

  submitCreate() {
    this.error.set('');
    const sc = this.selectedClient();
    const body: Record<string, unknown> = {
      employerId: sc?.id,
      clientName: sc ? undefined : this.form['clientName'],
      clientPhone: sc ? undefined : this.form['clientPhone'],
      startDay: this.form['startDay'],
      meal: this.form['meal'],
      workersNeeded: Number(this.form['workersNeeded']),
      salaryPerPerson: Number(this.form['salaryPerPerson']),
      startTime: this.form['startTime'],
      endTime: this.form['endTime'] || null,
      address: this.form['address'],
      location:
        this.form['lat'] && this.form['lng']
          ? { lat: Number(this.form['lat']), lng: Number(this.form['lng']) }
          : null,
      buses: this.form['buses'] || null,
      description: this.form['description'],
      contactPhone: this.form['contactPhone'],
    };
    this.api.post('jobs', body).subscribe({
      next: () => {
        this.createOpen.set(false);
        this.load();
      },
      error: (e) =>
        this.error.set(e?.error?.message ?? "E'lon yaratishda xatolik"),
    });
  }

  private emptyForm(): Record<string, string | number> {
    return {
      clientName: '',
      clientPhone: '',
      startDay: 'today',
      meal: "yo'q",
      workersNeeded: 1,
      salaryPerPerson: 0,
      startTime: '08:00',
      endTime: '',
      address: '',
      lat: '',
      lng: '',
      buses: '',
      description: '',
      contactPhone: '',
    };
  }
}
