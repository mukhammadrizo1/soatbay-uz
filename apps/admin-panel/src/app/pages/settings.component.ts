import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

interface Settings {
  cardNumber: string;
  cardHolderName: string;
  vipPrice: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="mb-4 text-2xl font-bold">Sozlamalar</h1>
    @if (model(); as m) {
      <div class="card max-w-lg">
        <div class="flex flex-col gap-3">
          <div>
            <label class="mb-1 block text-sm font-medium">Karta raqami</label>
            <input class="input" [(ngModel)]="m.cardNumber" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Karta egasi (F.I.O.)</label>
            <input class="input" [(ngModel)]="m.cardHolderName" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">VIP narxi (so'm)</label>
            <input class="input" type="number" [(ngModel)]="m.vipPrice" />
          </div>
          <div class="mt-2 flex items-center gap-3">
            <button class="btn-primary" (click)="save(m)">Saqlash</button>
            @if (saved()) {
              <span class="text-sm text-green-600">Saqlandi ✅</span>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  model = signal<Settings | null>(null);
  saved = signal(false);

  ngOnInit() {
    this.api.get<Settings>('settings').subscribe((s) => this.model.set(s));
  }

  save(m: Settings) {
    this.api
      .patch('settings', {
        cardNumber: m.cardNumber,
        cardHolderName: m.cardHolderName,
        vipPrice: Number(m.vipPrice),
      })
      .subscribe(() => {
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      });
  }
}
