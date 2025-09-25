import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, orderBy, where } from '@angular/fire/firestore';
import { BlogPost } from '../../features/blog/blog-content';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

@Injectable({
  providedIn: 'root'
})
export class SitemapGeneratorService {
  private readonly _firestore = inject(Firestore);

  /**
   * Generate complete sitemap XML including all blog articles from Firestore
   */
  async generateSitemap(): Promise<string> {
    const urls = await this.getAllUrls();
    return this.buildSitemapXml(urls);
  }

  /**
   * Get all URLs for sitemap including static pages and dynamic blog content
   */
  private async getAllUrls(): Promise<SitemapUrl[]> {
    const staticUrls = this.getStaticUrls();
    const blogUrls = await this.getBlogUrls();
    
    return [...staticUrls, ...blogUrls];
  }

  /**
   * Get static page URLs
   */
  private getStaticUrls(): SitemapUrl[] {
    const baseUrl = 'https://gitplumbers.com';
    const currentDate = new Date().toISOString().slice(0, 10);

    return [
      // Homepage - Highest priority
      {
        loc: `${baseUrl}/`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 1.0
      },
      // Services Page - High priority for SEO
      {
        loc: `${baseUrl}/services/`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.9
      },
      // About Page - Important for E-E-A-T
      {
        loc: `${baseUrl}/about/`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      // Contact Page - Important for business
      {
        loc: `${baseUrl}/contact/`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      // Blog Main Page - Content marketing hub
      {
        loc: `${baseUrl}/blog/`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      // Blog Archive - canonical listing
      {
        loc: `${baseUrl}/blog/articles/`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      // Case Studies - High value for AI citation
      {
        loc: `${baseUrl}/blog/case-studies/`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      // Technical Guides - AI-optimized content
      {
        loc: `${baseUrl}/blog/guides/`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.8
      },
      // Legal pages
      {
        loc: `${baseUrl}/legal/privacy/`,
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      },
      {
        loc: `${baseUrl}/legal/terms/`,
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      }
    ];
  }

  /**
   * Get all blog article URLs from Firestore
   */
  private async getBlogUrls(): Promise<SitemapUrl[]> {
    try {
      const postsCollection = collection(this._firestore, 'blog_posts');
      const publishedQuery = query(
        postsCollection,
        where('published', '==', true),
        orderBy('publishedOn', 'desc')
      );

      const snapshot = await getDocs(publishedQuery);
      const baseUrl = 'https://gitplumbers.com';

      return snapshot.docs.map(doc => {
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
          priority
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Build XML sitemap from URL array
   */
  private buildSitemapXml(urls: SitemapUrl[]): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

    const urlEntries = urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

    const footer = '\n</urlset>';

    return `${header}\n${urlEntries}${footer}`;
  }

  /**
   * Get sitemap statistics for monitoring
   */
  async getSitemapStats(): Promise<{
    totalUrls: number;
    blogArticles: number;
    staticPages: number;
    lastGenerated: string;
  }> {
    const urls = await this.getAllUrls();
    const blogUrls = await this.getBlogUrls();
    const staticUrls = this.getStaticUrls();

    return {
      totalUrls: urls.length,
      blogArticles: blogUrls.length,
      staticPages: staticUrls.length,
      lastGenerated: new Date().toISOString()
    };
  }
}
