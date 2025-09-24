import { Routes } from '@angular/router';
import { adminGuard, userGuard } from './shared/guards/auth.guards';
import { blogRoutes } from './features/blog/blog.routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketing/landing.component').then((m) => m.LandingComponent),
    data: {
      seo: {
        title: 'GitPlumbers - AI Code Optimization & Enterprise Modernization',
        description:
          'Transform AI-generated codebases into production-ready applications. Expert network specializing in React, Vue, Angular, Node.js, Python optimization.',
        keywords: [
          'AI code optimization',
          'enterprise modernization',
          'React performance',
          'Angular optimization',
          'Vue.js scaling',
          'technical debt resolution',
        ],
      },
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact/contact').then((m) => m.ContactComponent),
    data: {
      seo: {
        title: 'Contact GitPlumbers - Get Your Code Audit Today',
        description:
          'Ready to transform your AI-generated codebase, or start something new? Contact our expert network for code audits, optimization,rapid proto-typing, and enterprise modernization services. We can help you get your idea off the ground quickly and efficiently.',
        keywords: [
          'code audit',
          'technical consultation',
          'enterprise development',
          'code review services',
        ],
      },
    },
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/marketing/services.component').then((m) => m.ServicesComponent),
    data: {
      seo: {
        title: 'Code Optimization Services | React, Angular, Vue, Node.js Experts',
        description:
          'Comprehensive code optimization services for React, Angular, Vue, Node.js, and Python. Enterprise modernization, technical debt resolution, and performance optimization. We can help you get your idea off the ground quickly and efficiently.',
        keywords: [
          'code optimization services',
          'React optimization',
          'Angular performance',
          'Vue.js consulting',
          'Node.js scaling',
          'Python modernization',
        ],
      },
    },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/marketing/about.component').then((m) => m.AboutComponent),
    data: {
      seo: {
        title: 'About GitPlumbers - Expert Network of Senior Developers',
        description:
          'Meet the expert network behind GitPlumbers. Senior developers specializing in enterprise code optimization, modernization, and AI-generated code cleanup. We can help you get your idea off the ground quickly and efficiently.',
        keywords: [
          'senior developers',
          'technical experts',
          'code optimization team',
          'enterprise consultants',
        ],
      },
    },
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
    path: 'profile',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'dashboard/contact',
    redirectTo: '/contact',
    pathMatch: 'full',
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
    path: 'ai-analytics',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/dashboard/ai-analytics-dashboard.component').then(
        (m) => m.AiAnalyticsDashboardComponent
      ),
    data: {
      seo: {
        title: 'AI Analytics Dashboard - GitPlumbers',
        description: 'Track AI-driven traffic, citations, and content performance analytics. We can help you get your idea off the ground quickly and efficiently.',
        keywords: ['AI analytics', 'traffic tracking', 'content performance', 'dashboard'],
      },
    },
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
    path: 'blog-admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/blog/blog-admin/blog-admin.component').then((m) => m.BlogAdminComponent),
  },
  // Import blog routes
  ...blogRoutes,
  {
    path: 'services/:slug',
    loadComponent: () =>
      import('./features/marketing/service-detail.component').then((m) => m.ServiceDetailComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
