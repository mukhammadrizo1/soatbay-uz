import { Component, inject, Input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

/**
 * Telegram fayl (rasm) ko'rish komponenti: avval kichik "ko'rish" tugmasi,
 * bosilganda modalda kattalashtirib ko'rsatadi va "Yuklab olish" tugmasi beradi.
 */
@Component({
  selector: 'app-image-viewer',
  standalone: true,
  template: `
    @if (fileId) {
      <button class="btn-outline text-xs" (click)="open()">{{ label }}</button>
      @if (shown() && url()) {
        <div
          class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 p-4"
          (click)="close()"
        >
          <img
            [src]="url()!"
            alt="rasm"
            class="max-h-[80vh] max-w-[90vw] rounded-lg"
            (click)="$event.stopPropagation()"
          />
          <div class="flex gap-2" (click)="$event.stopPropagation()">
            <button class="btn-primary" (click)="downloadFile()">Yuklab olish</button>
            <button class="btn-outline" (click)="close()">Yopish</button>
          </div>
        </div>
      }
    } @else {
      <span class="text-xs text-slate-400">—</span>
    }
  `,
})
export class ImageViewerComponent {
  private api = inject(ApiService);

  @Input() which: 'employer' | 'worker' = 'worker';
  @Input() fileId: string | null = null;
  @Input() label = "🖼 Ko'rish";
  @Input() filename = 'rasm.jpg';

  shown = signal(false);
  url = signal<string | null>(null);

  open() {
    if (!this.fileId) return;
    if (!this.url()) {
      this.api
        .fileObjectUrl(this.which, this.fileId)
        .subscribe((u) => this.url.set(u));
    }
    this.shown.set(true);
  }

  close() {
    this.shown.set(false);
  }

  downloadFile() {
    if (this.fileId) this.api.download(this.which, this.fileId, this.filename);
  }
}
