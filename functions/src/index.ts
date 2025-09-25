// import { onRequest } from 'firebase-functions/v2/https';
// import { resolve } from 'path';
import * as admin from 'firebase-admin';

admin.initializeApp();

// let server: (req: any, res: any) => void;

// export const ssr = onRequest(async (request, response) => {
//   if (!server) {
//     const serverModule = await import(
//       resolve(process.cwd(), '../dist/gitplumbers-35d92/server/server.mjs')
//     );
//     server = serverModule.reqHandler;
//   }
//   return server(request, response);
// });

export * from './contact';
export * from './ai-analytics';
export * from './blog-generator';
export * from './github-api';
export * from './github-issues';
export * from './sitemap-generator';
export * from './sitemap-trigger';
