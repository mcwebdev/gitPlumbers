import { Routes } from '@angular/router';

export const blogRoutes: Routes = [
  {
    path: 'blog',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./blog-list/blog-list.component').then((m) => m.BlogListComponent),
        data: {
          seo: {
            title: 'Technical Insights & Code Optimization Blog | GitPlumbers',
            description:
              'Expert insights on code optimization, tech debt reduction, and enterprise modernization. Learn from senior developers across React, Angular, Vue, Node.js, and Python.',
            keywords: [
              'code optimization blog',
              'tech debt insights',
              'enterprise modernization',
              'React best practices',
              'Angular optimization',
              'Vue.js performance',
            ],
          },
        },
      },
      {
        path: 'category/:slug',
        data: {
          prerender: false,
        },
        loadComponent: () =>
          import('./blog-category/blog-category.component').then((m) => m.BlogCategoryComponent),
      },
      {
        path: 'case-studies',
        loadComponent: () =>
          import('./case-studies/case-studies-list.component').then(
            (m) => m.CaseStudiesListComponent
          ),
        data: {
          seo: {
            title: 'Code Optimization Case Studies | GitPlumbers Success Stories',
            description:
              'Real-world case studies showing how we transformed AI-generated codebases into production-ready applications. See measurable results and client testimonials.',
            keywords: [
              'code optimization case studies',
              'enterprise modernization success',
              'technical debt resolution',
              'AI code cleanup results',
            ],
          },
        },
      },
      {
        path: 'case-studies/:slug',
        data: {
          prerender: false,
        },
        loadComponent: () =>
          import('./case-studies/case-study-detail.component').then(
            (m) => m.CaseStudyDetailComponent
          ),
      },
      {
        path: 'guides',
        loadComponent: () =>
          import('./technical-guides/guides-list.component').then((m) => m.GuidesListComponent),
        data: {
          seo: {
            title: 'Technical Guides & Best Practices | GitPlumbers',
            description:
              'Comprehensive technical guides for React, Angular, Vue, Node.js, and Python. Step-by-step tutorials for code optimization and modernization.',
            keywords: [
              'React optimization guide',
              'Angular best practices',
              'Vue.js performance',
              'Node.js scaling',
              'Python modernization',
            ],
          },
        },
      },
      {
        path: 'guides/:slug',
        data: {
          prerender: false,
        },
        loadComponent: () =>
          import('./technical-guides/guide-detail.component').then((m) => m.GuideDetailComponent),
      },
      {
        path: ':slug',
        data: {
          prerender: false,
        },
        loadComponent: () =>
          import('./blog-post/blog-post.component').then((m) => m.BlogPostComponent),
      },
    ],
  },
];
