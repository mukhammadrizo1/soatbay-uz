import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-100">
      <div class="card w-full max-w-sm">
        <h1 class="mb-1 text-xl font-bold text-brand">Soatbay Admin</h1>
        <p class="mb-4 text-sm text-slate-500">Tizimga kirish</p>
        <form (ngSubmit)="submit()" class="flex flex-col gap-3">
          <div>
            <label class="mb-1 block text-sm font-medium">Login</label>
            <input class="input" name="username" [(ngModel)]="username" required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Parol</label>
            <input
              class="input"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
            />
          </div>
          @if (error()) {
            <p class="text-sm text-red-600">{{ error() }}</p>
          }
          <button class="btn-primary mt-2" [disabled]="loading()">
            {{ loading() ? '...' : 'Kirish' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  submit() {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Login yoki parol noto'g'ri");
      },
    });
  }
}
