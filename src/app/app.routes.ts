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
    path: 'ai-rescue-sprint',
    loadComponent: () =>
      import('./features/marketing/ai-rescue-sprint.component').then((m) => m.AiRescueSprintComponent),
    data: {
      seo: {
        title: 'AI Code Rescue Sprint - Transform Your AI-Generated Codebase in 1 Week | $5K',
        description:
          'One-week intensive audit and optimization of your AI-generated codebase. Get a comprehensive code health report, critical fixes implemented, 90-day roadmap, and knowledge transfer session. Perfect for startups and teams dealing with AI-assisted code.',
        keywords: [
          'AI code rescue',
          'AI-generated code audit',
          'code cleanup service',
          'ChatGPT code optimization',
          'Cursor code review',
          'GitHub Copilot cleanup',
          'startup code audit',
          'code health report',
          '1 week code sprint',
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
    data: {
      ssr: false, // Disable SSR for authenticated routes
    },
  },
  {
    path: 'profile',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'invoices',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/invoices/invoice-dashboard/invoice-dashboard.component').then((m) => m.InvoiceDashboardComponent),
    data: {
      seo: {
        title: 'Invoice Management - GitPlumbers',
        description: 'Create, manage, and track invoices for your work. Professional invoicing made simple with Stripe integration.',
        keywords: ['invoice management', 'billing', 'payments', 'Stripe', 'freelance invoicing'],
      },
    },
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
    data: {
      ssr: false, // Disable SSR for admin routes
    },
  },
  {
    path: 'admin/invoices',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/invoices/admin-invoice-management/admin-invoice-management.component').then(
        (m) => m.AdminInvoiceManagementComponent
      ),
    data: {
      ssr: false, // Disable SSR for this admin route
    },
  },
  {
    path: 'admin/proposals',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/proposals/admin-proposal-management/admin-proposal-management.component').then(
        (m) => m.AdminProposalManagementComponent
      ),
    data: {
      ssr: false, // Disable SSR for this admin route
    },
  },
  {
    path: 'proposals',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/proposals/user-proposal-dashboard/user-proposal-dashboard.component').then(
        (m) => m.UserProposalDashboardComponent
      ),
    data: {
      ssr: false, // Disable SSR for authenticated routes
      seo: {
        title: 'Proposals - GitPlumbers',
        description: 'Review and manage proposals sent to you by GitPlumbers.',
        keywords: ['proposals', 'project proposals', 'GitPlumbers proposals'],
      },
    },
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
  // Legal pages
  {
    path: 'legal/privacy',
    loadComponent: () =>
      import('./features/legal/privacy/privacy.component').then((m) => m.PrivacyComponent),
    data: {
      seo: {
        title: 'Privacy Policy | GitPlumbers',
        description: 'Learn how GitPlumbers protects your privacy and handles your data. Our commitment to data security and user privacy.',
        keywords: ['privacy policy', 'data protection', 'user privacy', 'GitPlumbers privacy'],
      },
    },
  },
  {
    path: 'legal/terms',
    loadComponent: () =>
      import('./features/legal/terms/terms.component').then((m) => m.TermsComponent),
    data: {
      seo: {
        title: 'Terms of Service | GitPlumbers',
        description: 'Read GitPlumbers Terms of Service. Understand your rights and responsibilities when using our code optimization and enterprise modernization services.',
        keywords: ['terms of service', 'user agreement', 'GitPlumbers terms', 'service terms'],
      },
    },
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
