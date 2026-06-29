import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Qayta ishlatiladigan sahifalash boshqaruvi. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <div class="mt-4 flex items-center justify-center gap-2">
        <button
          class="btn-outline"
          [disabled]="page <= 1"
          (click)="go(page - 1)"
        >
          ⬅️ Oldingi
        </button>
        <span class="text-sm text-slate-500">{{ page }} / {{ totalPages }}</span>
        <button
          class="btn-outline"
          [disabled]="page >= totalPages"
          (click)="go(page + 1)"
        >
          Keyingi ➡️
        </button>
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  go(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }
}
