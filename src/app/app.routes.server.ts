import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
