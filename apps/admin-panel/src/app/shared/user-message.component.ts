import { Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

/**
 * Foydalanuvchiga (rol bo'yicha mos botdan) matn + ixtiyoriy rasm/video
 * yuborish modali. `userId` ichki UUID bo'lishi kerak.
 */
@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [FormsModule],
  template: `
    <button class="btn-outline" (click)="open.set(true)">✉️ Xabar yuborish</button>
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card w-full max-w-md">
          <h2 class="mb-3 text-lg font-bold">Xabar yuborish</h2>
          <textarea
            class="input mb-3"
            rows="4"
            placeholder="Xabar matni"
            [(ngModel)]="text"
          ></textarea>
          <label class="mb-1 block text-sm text-slate-500">Rasm / video (ixtiyoriy)</label>
          <input
            class="input mb-3"
            type="file"
            accept="image/*,video/*"
            (change)="onFile($event)"
          />
          @if (error()) {
            <p class="mb-2 text-sm text-red-600">{{ error() }}</p>
          }
          <div class="flex justify-end gap-2">
            <button class="btn-outline" (click)="close()">Bekor qilish</button>
            <button class="btn-primary" [disabled]="sending()" (click)="send()">
              {{ sending() ? 'Yuborilmoqda...' : 'Yuborish' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UserMessageComponent {
  private api = inject(ApiService);
  @Input({ required: true }) userId!: string;

  open = signal(false);
  sending = signal(false);
  error = signal('');
  text = '';
  file: File | null = null;

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
  }

  close() {
    this.open.set(false);
    this.text = '';
    this.file = null;
    this.error.set('');
  }

  send() {
    if (!this.text.trim() && !this.file) {
      this.error.set('Matn yoki media kiriting');
      return;
    }
    const form = new FormData();
    if (this.text.trim()) form.append('text', this.text.trim());
    if (this.file) form.append('file', this.file);
    this.sending.set(true);
    this.api.upload(`users/${this.userId}/message`, form).subscribe({
      next: () => {
        this.sending.set(false);
        this.close();
      },
      error: (e) => {
        this.sending.set(false);
        this.error.set(e?.error?.message ?? 'Yuborishda xatolik');
      },
    });
  }
}
