import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const SIDEBAR_KEY = 'soatbay_sidebar_open';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen">
      <aside
        class="shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out"
        [class.w-60]="sidebarOpen()"
        [class.w-0]="!sidebarOpen()"
        [class.border-r-0]="!sidebarOpen()"
      >
        <div class="w-60 px-5 py-4 text-lg font-bold text-brand">Soatbay Admin</div>
        <nav class="flex w-60 flex-col gap-1 px-3 pb-4">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand/10 text-brand font-semibold"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              (click)="closeSidebarOnMobile()"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>
      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn-outline px-2 py-1.5"
              (click)="toggleSidebar()"
              [attr.aria-label]="sidebarOpen() ? 'Sidebarni yopish' : 'Sidebarni ochish'"
              [title]="sidebarOpen() ? 'Sidebarni yopish' : 'Sidebarni ochish'"
            >
              {{ sidebarOpen() ? '◀' : '☰' }}
            </button>
            <div class="text-sm text-slate-500">Boshqaruv paneli</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="hidden text-sm font-medium sm:inline">{{ auth.username() }}</span>
            <button class="btn-outline" (click)="logout()">Chiqish</button>
          </div>
        </header>
        <main class="flex-1 overflow-auto p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(true);

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

  ngOnInit() {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) this.sidebarOpen.set(saved === '1');
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
    localStorage.setItem(SIDEBAR_KEY, this.sidebarOpen() ? '1' : '0');
  }

  closeSidebarOnMobile() {
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.sidebarOpen.set(false);
      localStorage.setItem(SIDEBAR_KEY, '0');
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
