import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { BlogPost } from './types/blog-content';

const db = getFirestore();

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Generate dynamic sitemap including all blog articles from Firestore
 */
export const generateSitemap = onRequest(
  { cors: true, memory: '1GiB' },
  async (req, res) => {
    try {
      // Set proper headers for XML sitemap
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      const sitemapXml = await buildSitemapXml();
      res.status(200).send(sitemapXml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  }
);

/**
 * Build complete sitemap XML
 */
async function buildSitemapXml(): Promise<string> {
  const urls = await getAllUrls();
  return buildXmlFromUrls(urls);
}

/**
 * Get all URLs for sitemap
 */
async function getAllUrls(): Promise<SitemapUrl[]> {
  const staticUrls = getStaticUrls();
  const blogUrls = await getBlogUrls();

  return [...staticUrls, ...blogUrls];
}

/**
 * Get static page URLs
 * @return {SitemapUrl[]} Array of static page URLs
 */
function getStaticUrls(): SitemapUrl[] {
  const baseUrl = 'https://gitplumbers.com';
  const currentDate = new Date().toISOString().slice(0, 10);

  return [
    // Homepage - Highest priority
    {
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 1.0,
    },
    // Services Page - High priority for SEO
    {
      loc: `${baseUrl}/services/`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.9,
    },
    // About Page - Important for E-E-A-T
    {
      loc: `${baseUrl}/about/`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.8,
    },
    // Contact Page - Important for business
    {
      loc: `${baseUrl}/contact/`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.8,
    },
    // Blog Main Page - Content marketing hub
    {
      loc: `${baseUrl}/blog/`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.9,
    },
    // Blog Archive - canonical listing
    {
      loc: `${baseUrl}/blog/articles/`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.9,
    },
    // Case Studies - High value for AI citation
    {
      loc: `${baseUrl}/blog/case-studies/`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.9,
    },
    // Technical Guides - AI-optimized content
    {
      loc: `${baseUrl}/blog/guides/`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.8,
    },
    // Legal pages
    {
      loc: `${baseUrl}/legal/privacy/`,
      lastmod: currentDate,
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      loc: `${baseUrl}/legal/terms/`,
      lastmod: currentDate,
      changefreq: 'yearly',
      priority: 0.3,
    },
  ];
}

/**
 * Get all blog article URLs from Firestore
 */
async function getBlogUrls(): Promise<SitemapUrl[]> {
  try {
    console.log('=== STARTING BLOG URL GENERATION ===');
    console.log('Function version: 2025-09-25-v2 - No index queries');
    // First, let's get all blog posts to see what we have
    console.log('Step 1: Getting first 5 blog posts for structure analysis...');
    const allPostsSnapshot = await db
      .collection('blog_posts')
      .limit(5)
      .get();

    console.log(`Found ${allPostsSnapshot.size} blog posts in collection (first 5)`);

    // Log the first few posts to see their structure
    allPostsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Post ${index + 1} structure:`, {
        id: doc.id,
        title: data.title,
        published: data.published,
        status: data.status,
        slug: data.slug,
        publishedOn: data.publishedOn,
        createdAt: data.createdAt,
        allFields: Object.keys(data),
      });
    });

    // Now try to get all posts and filter in JavaScript to avoid index issues
    console.log('Step 2: Getting ALL blog posts (no filters, no indexes)...');
    const allPostsSnapshot2 = await db
      .collection('blog_posts')
      .get();

    console.log(`Total blog posts in collection: ${allPostsSnapshot2.size}`);

    // Filter for published posts in JavaScript
    console.log('Step 3: Filtering for published posts in JavaScript...');
    const publishedPosts = allPostsSnapshot2.docs.filter((doc) => {
      const data = doc.data();
      const isPublished = data.status === 'published';
      console.log(`Post "${data.title}": status=${data.status}, isPublished=${isPublished}`);
      return isPublished;
    });

    console.log(`Found ${publishedPosts.length} published blog posts out of ${allPostsSnapshot2.size} total`);

    // Log details about published posts
    publishedPosts.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Published post ${index + 1}:`, {
        id: doc.id,
        title: data.title,
        slug: data.slug,
        publishedOn: data.publishedOn,
        categorySlug: data.categorySlug,
      });
    });

    const baseUrl = 'https://gitplumbers.com';

    const urls = publishedPosts.map((doc) => {
      const post = doc.data() as BlogPost;
      const publishedDate = post.publishedOn || post.createdAt;
      const lastmod = publishedDate ? new Date(publishedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

      // Determine priority based on category
      let priority = 0.7; // Default for articles
      if (post.categorySlug === 'case-studies') {
        priority = 0.8; // Higher priority for case studies
      } else if (post.categorySlug === 'guides') {
        priority = 0.8; // Higher priority for guides
      }

      // Determine change frequency
      let changefreq: SitemapUrl['changefreq'] = 'monthly';
      if (post.categorySlug === 'case-studies') {
        changefreq = 'yearly'; // Case studies don't change often
      } else if (post.categorySlug === 'guides') {
        changefreq = 'monthly'; // Guides may be updated
      }

      return {
        loc: `${baseUrl}/blog/${post.slug}/`,
        lastmod,
        changefreq,
        priority,
        publishedOn: publishedDate,
      };
    });

    // URLs are already sorted by publishedOn desc from the query
    const sortedUrls = urls.map(({ publishedOn: _, ...url }) => url);

    console.log('Step 4: Generated blog URLs:' );
    sortedUrls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url.loc} (priority: ${url.priority}, changefreq: ${url.changefreq})`);
    });

    console.log(`=== COMPLETED BLOG URL GENERATION: ${sortedUrls.length} URLs ===`);
    return sortedUrls;
  } catch (error) {
    console.error('=== ERROR IN BLOG URL GENERATION ===');
    console.error('Error fetching blog posts for sitemap:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      code: (error as any).code,
      stack: (error as Error).stack,
    });
    return [];
  }
}

/**
 * Build XML sitemap from URL array
 * @param {SitemapUrl[]} urls Array of URLs to include in sitemap
 * @return {string} Complete XML sitemap
 */
function buildXmlFromUrls(urls: SitemapUrl[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

  const urlEntries = urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

  const footer = '\n</urlset>';

  return `${header}\n${urlEntries}${footer}`;
}

/**
 * Generate sitemap index for large numbers of URLs (50,000+ limit)
 */
export const generateSitemapIndex = onRequest(
  { cors: true, memory: '1GiB' },
  async (req, res) => {
    try {
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600');

      const sitemapIndexXml = await buildSitemapIndexXml();
      res.status(200).send(sitemapIndexXml);
    } catch (error) {
      console.error('Error generating sitemap index:', error);
      res.status(500).send('Error generating sitemap index');
    }
  }
);

/**
 * Build sitemap index XML for large sites
 */
async function buildSitemapIndexXml(): Promise<string> {
  const baseUrl = 'https://gitplumbers.com';
  const currentDate = new Date().toISOString().slice(0, 10);

  // Get total count of blog posts
  const postsSnapshot = await db
    .collection('blog_posts')
    .where('published', '==', true)
    .get();

  const totalPosts = postsSnapshot.size;
  const postsPerSitemap = 50000; // Google's limit
  const sitemapCount = Math.ceil(totalPosts / postsPerSitemap);

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const sitemapEntries = [
    // Main sitemap with static pages
    `  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`,
  ];

  // Add blog sitemaps if needed
  for (let i = 0; i < sitemapCount; i++) {
    sitemapEntries.push(`  <sitemap>
    <loc>${baseUrl}/sitemap-blog-${i + 1}.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`);
  }

  const footer = '\n</sitemapindex>';

  return `${header}\n${sitemapEntries.join('\n')}${footer}`;
}
