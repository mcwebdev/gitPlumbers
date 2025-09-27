import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { BlogStore } from '../blog.store';
import { SeoService } from '../../../shared/services/seo.service';
import { BlogPost } from '../blog-content';

export interface BlogPostResolverResult {
  slug: string;
  post: BlogPost | null;
  relatedPosts: BlogPost[];
  foundExact: boolean;
}

// Helper function to convert date to string for SEO metadata
const toDateString = (date: string | Date | undefined | unknown): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  
  // Handle Firestore timestamps and other date-like objects
  if (typeof date === 'object' && date !== null) {
    const candidate = date as {
      toDate?: () => Date;
      toMillis?: () => number;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof candidate.toDate === 'function') {
      const result = candidate.toDate();
      return result instanceof Date ? result.toISOString() : undefined;
    }

    if (typeof candidate.toMillis === 'function') {
      return new Date(candidate.toMillis()).toISOString();
    }

    if (typeof candidate.seconds === 'number') {
      const base = candidate.seconds * 1000;
      if (typeof candidate.nanoseconds === 'number') {
        return new Date(base + Math.floor(candidate.nanoseconds / 1000000)).toISOString();
      }
      return new Date(base).toISOString();
    }
  }

  // Handle numbers (timestamps)
  if (typeof date === 'number') {
    // Check if it's a valid timestamp
    if (date > 1000000000000) {
      // Already in milliseconds
      return new Date(date).toISOString();
    } else if (date > 1000000000) {
      // In seconds, convert to milliseconds
      return new Date(date * 1000).toISOString();
    }
  }

  // If we can't convert it, return undefined
  return undefined;
};

export const blogPostResolver: ResolveFn<BlogPostResolverResult> = async (route: ActivatedRouteSnapshot) => {
  const slug = route.paramMap.get('slug') ?? '';
  const blogStore = inject(BlogStore);
  const seoService = inject(SeoService);

  // Get the post from the store
  const post: BlogPost | null = blogStore.getPostBySlug(slug) ?? null;
  const foundExact = !!post;
  
  // Get related posts if post exists
  const relatedPosts = post ? blogStore.getRelatedPosts(post.slug, post.categorySlug) : [];

  // Apply SEO metadata during route resolution (server-side)
  if (post) {
    const canonicalUrl = `https://gitplumbers.com/blog/${slug}/`;

    // Use pre-generated metadata from database if available
    if (post.seoMetadata) {
      const seo = post.seoMetadata;
      seoService.updateMetadata({
        title: seo.title,
        description: seo.description,
        ogTitle: seo.ogTitle,
        ogDescription: seo.ogDescription,
        ogImage: seo.ogImage,
        ogUrl: canonicalUrl,
        ogType: 'article',
        twitterTitle: seo.twitterTitle,
        twitterDescription: seo.twitterDescription,
        twitterImage: seo.twitterImage,
        articleSection: seo.articleSection,
        articleAuthor: post.author?.name,
        articlePublishedTime: post.publishedOn,
        articleModifiedTime: toDateString(post.updatedAt) ?? post.publishedOn,
        canonical: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });

      // Add structured data
      seoService.addStructuredData(seo.structuredDataArticle, {
        identifier: 'blog-article',
      });
      if (seo.structuredDataFAQ) {
        seoService.addStructuredData(seo.structuredDataFAQ, {
          identifier: 'blog-faq',
        });
      }
    } else {
      // Fallback for posts without pre-generated SEO
      const metadata = seoService.generateAiOptimizedMetadata({
        title: `${post.title} | GitPlumbers Insights`,
        description: post.summary,
        keywords: [...post.keywords],
        url: canonicalUrl,
      });

      seoService.updateMetadata({
        ...metadata,
        ogType: 'article',
        articleAuthor: post.author?.name,
        articlePublishedTime: post.publishedOn,
        articleModifiedTime: toDateString(post.updatedAt) ?? post.publishedOn,
        canonical: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });

      // Add structured data for article
      const structuredData: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.summary,
        datePublished: post.publishedOn,
        articleSection: post.categorySlug,
        author: {
          '@type': 'Organization',
          name: 'GitPlumbers',
        },
        publisher: {
          '@type': 'Organization',
          name: 'GitPlumbers',
        },
        url: canonicalUrl,
      };

      if (post.faq && post.faq.length) {
        structuredData['mainEntity'] = post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        }));
      }

      seoService.addStructuredData(structuredData, {
        identifier: 'blog-article',
      });
    }
  } else {
    // Handle post not found case
    const canonicalUrl = `https://gitplumbers.com/blog/${slug}/`;
    seoService.updateMetadata({
      title: 'Post not found | GitPlumbers Insights',
      description: 'The resource you requested is unavailable. Explore our latest insights instead.',
      canonical: canonicalUrl,
      ogUrl: canonicalUrl,
      robotsIndex: false,
      robotsFollow: false,
    });
  }

  return {
    slug,
    post,
    relatedPosts,
    foundExact,
  };
};
