import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Tailwind uslubidagi sana oralig'i tanlagich (from/to). */
@Component({
  selector: 'app-date-range',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label class="block text-xs text-slate-500">Dan</label>
        <input class="input" type="date" [(ngModel)]="from" />
      </div>
      <div>
        <label class="block text-xs text-slate-500">Gacha</label>
        <input class="input" type="date" [(ngModel)]="to" />
      </div>
      <button class="btn-primary" (click)="apply()">Filtrlash</button>
      @if (from || to) {
        <button class="btn-outline" (click)="clear()">Tozalash</button>
      }
    </div>
  `,
})
export class DateRangeComponent {
  from = '';
  to = '';
  @Output() rangeChange = new EventEmitter<{ from: string; to: string }>();

  apply() {
    this.rangeChange.emit({ from: this.from, to: this.to });
  }

  clear() {
    this.from = '';
    this.to = '';
    this.rangeChange.emit({ from: '', to: '' });
  }
}
