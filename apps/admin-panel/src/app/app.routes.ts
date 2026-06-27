import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./pages/clients.component').then((m) => m.ClientsComponent),
      },
      {
        path: 'clients/:id',
        loadComponent: () =>
          import('./pages/client-detail.component').then(
            (m) => m.ClientDetailComponent,
          ),
      },
      {
        path: 'workers',
        loadComponent: () =>
          import('./pages/workers.component').then((m) => m.WorkersComponent),
      },
      {
        path: 'workers/:id',
        loadComponent: () =>
          import('./pages/worker-detail.component').then(
            (m) => m.WorkerDetailComponent,
          ),
      },
      {
        path: 'deposits',
        loadComponent: () =>
          import('./pages/deposits.component').then((m) => m.DepositsComponent),
      },
      {
        path: 'deposits/:id',
        loadComponent: () =>
          import('./pages/deposit-detail.component').then(
            (m) => m.DepositDetailComponent,
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs.component').then((m) => m.JobsComponent),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./pages/job-detail.component').then(
            (m) => m.JobDetailComponent,
          ),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./pages/applications.component').then(
            (m) => m.ApplicationsComponent,
          ),
      },
      {
        path: 'applications/:id',
        loadComponent: () =>
          import('./pages/application-detail.component').then(
            (m) => m.ApplicationDetailComponent,
          ),
      },
      {
        path: 'pending',
        loadComponent: () =>
          import('./pages/pending.component').then((m) => m.PendingComponent),
      },
      {
        path: 'complaints',
        loadComponent: () =>
          import('./pages/complaints.component').then(
            (m) => m.ComplaintsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
