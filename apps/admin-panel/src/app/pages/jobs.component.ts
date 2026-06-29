import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';
import { DateRangeComponent } from '../shared/date-range.component';
import { statusLabel } from '../shared/status-labels';

interface Job {
  id: string;
  seq: number;
  salaryPerPerson: number;
  workersNeeded: number;
  status: string;
  startDate: string;
  address: string;
  employer: { fullName: string };
  _count: { applications: number };
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PaginationComponent,
    DateRangeComponent,
  ],
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-bold">E'lonlar</h1>
      <div class="flex flex-wrap items-end gap-2">
        <select class="input max-w-[140px]" [(ngModel)]="status" (change)="load(1)">
          <option value="">Barchasi</option>
          <option value="pending">Kutilmoqda</option>
          <option value="approved">Tasdiqlangan</option>
          <option value="closed">Yopiq</option>
          <option value="rejected">Bekor qilingan</option>
        </select>
        <app-date-range (rangeChange)="onRange($event)" />
      </div>
    </div>
    <div class="card overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ish beruvchi</th>
            <th>Manzil</th>
            <th>Ish haqi</th>
            <th>Ishchilar</th>
            <th>Arizalar</th>
            <th>Holat</th>
            <th>Sana</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (j of data()?.items; track j.id) {
            <tr>
              <td class="font-mono">#{{ j.seq }}</td>
              <td class="cell-truncate" [title]="j.employer.fullName">{{ j.employer.fullName }}</td>
              <td class="cell-truncate-md" [title]="j.address">{{ j.address }}</td>
              <td>{{ j.salaryPerPerson }} so'm</td>
              <td>{{ j.workersNeeded }}</td>
              <td>{{ j._count.applications }}</td>
              <td>{{ statusLabel(j.status) }}</td>
              <td>{{ j.startDate | date: 'shortDate' }}</td>
              <td><a class="btn-outline" [routerLink]="['/jobs', j.id]">Batafsil</a></td>
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
  `,
})
export class JobsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Job> | null>(null);
  status = '';
  from = '';
  to = '';
  readonly statusLabel = statusLabel;

  ngOnInit() {
    this.load();
  }

  onRange(r: { from: string; to: string }) {
    this.from = r.from;
    this.to = r.to;
    this.load(1);
  }

  load(page = 1) {
    this.api
      .get<Paginated<Job>>(
        'jobs',
        this.api.listQuery(page, {
          status: this.status,
          from: this.from,
          to: this.to,
        }),
      )
      .subscribe((d) => this.data.set(d));
  }
}
