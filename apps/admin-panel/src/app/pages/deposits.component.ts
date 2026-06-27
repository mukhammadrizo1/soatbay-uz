import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';
import { statusLabel } from '../shared/status-labels';

interface Deposit {
  id: string;
  seq: number;
  amount: number;
  status: string;
  createdAt: string;
  worker: { fullName: string; phone: string };
}

@Component({
  selector: 'app-deposits',
  standalone: true,
  imports: [DatePipe, RouterLink, PaginationComponent],
  template: `
    <h1 class="mb-4 text-2xl font-bold">Depozitlar</h1>
    <div class="card overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Foydalanuvchi</th>
            <th>Telefon</th>
            <th>Summa</th>
            <th>Holat</th>
            <th>Sana</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (d of data()?.items; track d.id) {
            <tr>
              <td class="font-mono">#{{ d.seq }}</td>
              <td>{{ d.worker.fullName }}</td>
              <td>{{ d.worker.phone }}</td>
              <td>{{ d.amount }} so'm</td>
              <td>{{ statusLabel(d.status) }}</td>
              <td>{{ d.createdAt | date: 'short' }}</td>
              <td><a class="btn-outline" [routerLink]="['/deposits', d.id]">Batafsil</a></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-pagination
      [page]="data()?.page ?? 1"
      [totalPages]="data()?.totalPages ?? 1"
      (pageChange)="load($event)"
    />
  `,
})
export class DepositsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Deposit> | null>(null);
  readonly statusLabel = statusLabel;

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<Deposit>>('deposits', { page })
      .subscribe((d) => this.data.set(d));
  }
}
