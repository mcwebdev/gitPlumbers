import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'blog/articles',
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
    getPrerenderParams: () => Promise.resolve([
      { slug: 'modernization' },
      { slug: 'observability' },
      { slug: 'ai-delivery' },
      { slug: 'reliability' },
      { slug: 'platform' },
    ]),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
