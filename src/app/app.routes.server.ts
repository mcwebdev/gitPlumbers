import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Blog main page
  {
    path: 'blog',
    renderMode: RenderMode.Prerender,
  },
  // Blog archive
  {
    path: 'blog/articles',
    renderMode: RenderMode.Prerender,
  },
  // Case studies listing
  {
    path: 'blog/case-studies',
    renderMode: RenderMode.Prerender,
  },
  // Technical guides listing
  {
    path: 'blog/guides',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'blog/category/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'blog/case-studies/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'blog/guides/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'services/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () =>
      Promise.resolve([
        { slug: 'modernization' },
        { slug: 'observability' },
        { slug: 'ai-delivery' },
        { slug: 'reliability' },
        { slug: 'platform' },
      ]),
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'ai-analytics',
    renderMode: RenderMode.Client,
  },
  {
    path: 'support-requests',
    renderMode: RenderMode.Client,
  },
  {
    path: 'blog-admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'legal/privacy',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'legal/terms',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
