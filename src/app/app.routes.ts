import { Routes } from '@angular/router';
import { adminGuard, userGuard } from './shared/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact/contact').then((m) => m.ContactComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'dashboard',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/dashboard/user-dashboard.component').then((m) => m.UserDashboardComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
  },
  {
    path: 'support-requests',
    canActivate: [adminGuard],
    loadComponent: () =>
      import(
        './features/support-requests/support-requests-list/support-requests-list.component'
      ).then((m) => m.SupportRequestsListComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
