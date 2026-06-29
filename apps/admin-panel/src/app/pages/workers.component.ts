import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Paginated } from '../core/api.service';
import { PaginationComponent } from '../shared/pagination.component';

interface Worker {
  id: string;
  seq: number;
  fullName: string;
  phone: string;
  age: number | null;
  balance: number;
  isVip: boolean;
  isBlocked: boolean;
}

@Component({
  selector: 'app-workers',
  standalone: true,
  imports: [RouterLink, FormsModule, PaginationComponent],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Ishchilar</h1>
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
            <th>Yosh</th>
            <th>Hisob</th>
            <th>VIP</th>
            <th>Holat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (w of data()?.items; track w.id) {
            <tr>
              <td class="font-mono">#{{ w.seq }}</td>
              <td class="cell-truncate" [title]="w.fullName">{{ w.fullName }}</td>
              <td class="cell-truncate" [title]="w.phone">{{ w.phone }}</td>
              <td>{{ w.age ?? '-' }}</td>
              <td>{{ w.balance }} so'm</td>
              <td>{{ w.isVip ? '✅' : '—' }}</td>
              <td>
                <span class="badge" [class]="w.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                  {{ w.isBlocked ? 'Bloklangan' : 'Faol' }}
                </span>
              </td>
              <td><a class="btn-outline" [routerLink]="['/workers', w.id]">Batafsil</a></td>
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
export class WorkersComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<Paginated<Worker> | null>(null);
  search = '';

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.api
      .get<Paginated<Worker>>('workers', this.api.listQuery(page, { search: this.search }))
      .subscribe((d) => this.data.set(d));
  }
}
