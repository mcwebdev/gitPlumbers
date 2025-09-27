import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Handle sitemap.xml requests by calling the Cloud Function
 */
app.get('/sitemap.xml', async (req, res) => {
  try {
    const functionsUrl = 'https://us-central1-gitplumbers-35d92.cloudfunctions.net';
    const sitemapUrl = `${functionsUrl}/generateSitemap`;
    
    // Fetch sitemap from Cloud Function
    const response = await fetch(sitemapUrl, {
      headers: {
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (response.ok) {
      const sitemapContent = await response.text();
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(sitemapContent);
    } else {
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap not available</error>');
    }
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap not available</error>');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
