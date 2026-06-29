import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Qayta ishlatiladigan sahifalash boshqaruvi. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (total > 0) {
      <div
        class="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <span class="text-sm text-slate-500">
          Jami {{ total }} ta · sahifa {{ page }} / {{ totalPages }}
          @if (pageSize) {
            <span class="text-slate-400"> ({{ pageSize }} ta/sahifa)</span>
          }
        </span>
        @if (totalPages > 1) {
          <div class="flex items-center gap-2">
            <button
              class="btn-outline"
              [disabled]="page <= 1"
              (click)="go(page - 1)"
            >
              ⬅️ Oldingi
            </button>
            <button
              class="btn-outline"
              [disabled]="page >= totalPages"
              (click)="go(page + 1)"
            >
              Keyingi ➡️
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() pageSize = 0;
  @Output() pageChange = new EventEmitter<number>();

  go(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }
}
