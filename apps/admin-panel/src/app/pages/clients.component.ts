import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';

interface Client {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
  telegramId: string | null;
  isBlocked: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PaginationComponent],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Mijozlar</h1>
      <input
        class="input max-w-xs"
        placeholder="ID / F.I.O. / telefon..."
        [(ngModel)]="search"
        (keyup.enter)="load(1)"
      />
    </div>
    <div class="card overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>F.I.O.</th>
            <th>Telefon</th>
            <th>Holat</th>
            <th>Sana</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (c of data()?.items; track c.id) {
            <tr>
              <td class="font-mono">#{{ c.seq }}</td>
              <td class="cell-truncate" [title]="c.fullName">{{ c.fullName }}</td>
              <td class="cell-truncate" [title]="c.phone">{{ c.phone }}</td>
              <td>
                <span class="badge" [class]="c.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                  {{ c.isBlocked ? 'Bloklangan' : 'Faol' }}
                </span>
              </td>
              <td>{{ c.createdAt | date: 'short' }}</td>
              <td>
                <a class="btn-outline" [routerLink]="['/clients', c.id]">Batafsil</a>
              </td>
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
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Client> | null>(null);
  search = '';

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<Client>>('clients', { search: this.search, page })
      .subscribe((d) => this.data.set(d));
  }
}
