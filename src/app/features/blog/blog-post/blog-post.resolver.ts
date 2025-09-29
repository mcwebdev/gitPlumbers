import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { BlogSearchService } from '../../../shared/services/blog-search.service';
import { SeoService } from '../../../shared/services/seo.service';
import { BlogPost, getBlogPostBySlug, getPostsByCategory } from '../blog-content';

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
  const blogSearch = inject(BlogSearchService);
  const seoService = inject(SeoService);

  if (!slug) {
    return { slug, post: null, relatedPosts: [], foundExact: false };
  }

  const staticPost = getBlogPostBySlug(slug) ?? null;

  let post: BlogPost | null = staticPost;
  let foundExact = !!staticPost;

  try {
    const firestorePost = await blogSearch.getPostBySlug(slug);
    if (firestorePost) {
      post = firestorePost;
      foundExact = firestorePost.slug === slug;
    } else {
      foundExact = false;
    }
  } catch {
    foundExact = !!staticPost;
  }

  let relatedPosts: BlogPost[] = [];

  if (post) {
    try {
      const firestoreRelated = await blogSearch.getPublishedPostsByCategory(
        post.categorySlug,
        3,
        post.slug
      );
      relatedPosts = firestoreRelated;
    } catch {
      // Failed to load related posts
    }
  }

  if (relatedPosts.length === 0) {
    const fallbackCategory = post?.categorySlug ?? staticPost?.categorySlug;

    if (fallbackCategory) {
      relatedPosts = getPostsByCategory(fallbackCategory)
        .filter((candidate) => !post || candidate.slug !== post.slug)
        .slice(0, 3) as BlogPost[];
    }
  }

  if (!post && relatedPosts.length > 0) {
    post = relatedPosts[0];
    relatedPosts = relatedPosts.slice(1);
    foundExact = false;
  }

  if (!post) {
    return { slug, post: null, relatedPosts: [], foundExact: false };
  }

  const resolved = {
    slug,
    post,
    relatedPosts: relatedPosts.slice(0, 2),
    foundExact,
  };

  // Apply SEO metadata during route resolution (server-side)
  if (post) {
    const canonicalUrl = `https://gitplumbers.com/blog/${slug}`;

    if (post.seoMetadata) {
      // Use pre-generated metadata from database
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
        articleModifiedTime: (() => {
          if (!post.updatedAt) {
            return post.publishedOn;
          }
          
          if (typeof post.updatedAt === 'string') {
            return post.updatedAt;
          }
          
          if (post.updatedAt instanceof Date) {
            return post.updatedAt.toISOString();
          }
          
          // Handle Firestore Timestamp
          if ((post.updatedAt as any).toDate) {
            return (post.updatedAt as any).toDate().toISOString();
          }
          
          return post.publishedOn;
        })(),
        canonical: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });

      // Add structured data
      if (seo.structuredDataArticle) {
        seoService.addStructuredData(seo.structuredDataArticle, {
          identifier: 'blog-article',
        });
      } else {
        // Fallback: generate structured data if not available
        const articleSchema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.summary,
          publisher: {
            '@type': 'Organization',
            name: 'GitPlumbers',
            url: 'https://gitplumbers.com/',
            logo: 'https://gitplumbers.com/logo.png'
          },
          mainEntityOfPage: canonicalUrl,
          datePublished: post.publishedOn,
          dateModified: (() => {
            console.log('DEBUG RESOLVER STRUCTURED DATA: post.updatedAt type:', typeof post.updatedAt);
            console.log('DEBUG RESOLVER STRUCTURED DATA: post.updatedAt value:', post.updatedAt);
            
            if (!post.updatedAt) {
              console.log('DEBUG RESOLVER STRUCTURED DATA: No updatedAt, using publishedOn:', post.publishedOn);
              return post.publishedOn;
            }
            
            if (typeof post.updatedAt === 'string') {
              console.log('DEBUG RESOLVER STRUCTURED DATA: updatedAt is string, returning as-is:', post.updatedAt);
              return post.updatedAt;
            }
            
            if (post.updatedAt instanceof Date) {
              console.log('DEBUG RESOLVER STRUCTURED DATA: updatedAt is Date, converting to ISO string');
              return post.updatedAt.toISOString();
            }
            
            // Handle Firestore Timestamp
            if ((post.updatedAt as any).toDate) {
              console.log('DEBUG RESOLVER STRUCTURED DATA: updatedAt is Firestore Timestamp, converting to Date then ISO string');
              return (post.updatedAt as any).toDate().toISOString();
            }
            
            console.log('DEBUG RESOLVER STRUCTURED DATA: Unknown updatedAt type, using publishedOn:', post.publishedOn);
            return post.publishedOn;
          })(),
          ...(post.author && {
            author: {
              '@type': 'Person',
              name: post.author.name,
              ...(post.author.title && { jobTitle: post.author.title }),
              ...(post.author.url && { url: post.author.url })
            }
          }),
          ...(seo.articleSection && { articleSection: seo.articleSection })
        };
        seoService.addStructuredData(articleSchema, {
          identifier: 'blog-article',
        });
      }
      
      if (seo.structuredDataFAQ) {
        seoService.addStructuredData(seo.structuredDataFAQ, {
          identifier: 'blog-faq',
        });
      } else if (post.faq && post.faq.length > 0) {
        // Fallback: generate FAQ schema if not available
        const faqSchema = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer
            }
          }))
        };
        seoService.addStructuredData(faqSchema, {
          identifier: 'blog-faq',
        });
      }
    } else {
      // Fallback for posts without pre-generated SEO
      seoService.updateMetadata({
        title: post.title
          ? `${post.title} | GitPlumbers`
          : 'Post not found | GitPlumbers',
        description: post.summary ?? 'Explore our latest insights on code optimization and modernization.',
        ogTitle: post.title ? `${post.title} | GitPlumbers` : 'Post not found | GitPlumbers',
        ogDescription: post.summary ?? 'Explore our latest insights on code optimization and modernization.',
        ogType: 'article',
        ogUrl: canonicalUrl,
        twitterTitle: post.title ? `${post.title} | GitPlumbers` : 'Post not found | GitPlumbers',
        twitterDescription: post.summary ?? 'Explore our latest insights on code optimization and modernization.',
        canonical: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });
    }
  }

  return resolved;
};
