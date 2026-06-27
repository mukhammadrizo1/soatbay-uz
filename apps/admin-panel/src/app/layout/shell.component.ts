import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen">
      <aside class="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div class="px-5 py-4 text-lg font-bold text-brand">Soatbay Admin</div>
        <nav class="flex flex-col gap-1 px-3">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand/10 text-brand font-semibold"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>
      <div class="flex flex-1 flex-col">
        <header
          class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3"
        >
          <div class="text-sm text-slate-500">Boshqaruv paneli</div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">{{ auth.username() }}</span>
            <button class="btn-outline" (click)="logout()">Chiqish</button>
          </div>
        </header>
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  nav: NavItem[] = [
    { label: 'Dashboard', path: 'dashboard', icon: '📊' },
    { label: 'Mijozlar', path: 'clients', icon: '🧑‍💼' },
    { label: 'Ishchilar', path: 'workers', icon: '👷' },
    { label: 'Depozitlar', path: 'deposits', icon: '💰' },
    { label: "E'lonlar", path: 'jobs', icon: '📢' },
    { label: 'Ishga yozilishlar', path: 'applications', icon: '📝' },
    { label: 'In pending', path: 'pending', icon: '⏳' },
    { label: 'Shikoyatlar', path: 'complaints', icon: '📨' },
    { label: 'Sozlamalar', path: 'settings', icon: '⚙️' },
  ];

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
