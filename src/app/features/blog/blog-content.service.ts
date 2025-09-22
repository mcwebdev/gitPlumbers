import { Injectable } from '@angular/core';
import {
  BLOG_CATEGORIES,
  CASE_STUDIES,
  GUIDES,
  BlogCategory,
  BlogPost,
  CaseStudy,
  GuideSummary,
  InternalLink,
  CTA,
  Author,
  SchemaHints,
  getCaseStudyBySlug,
  getCategoryBySlug,
  getGuideBySlug,
} from './blog-content';

@Injectable({ providedIn: 'root' })
export class BlogContentService {
  get categories(): ReadonlyArray<BlogCategory> {
    return BLOG_CATEGORIES;
  }

  getCategoryBySlug(slug: string): BlogCategory | undefined {
    return getCategoryBySlug(slug);
  }

  getCaseStudies(): ReadonlyArray<CaseStudy> {
    return Object.values(CASE_STUDIES);
  }

  getCaseStudy(slug: string): CaseStudy | undefined {
    return getCaseStudyBySlug(slug);
  }

  getGuides(): ReadonlyArray<GuideSummary> {
    return Object.values(GUIDES);
  }

  getGuide(slug: string): GuideSummary | undefined {
    return getGuideBySlug(slug);
  }

  // SEO Helper Methods
  generateOrganizationSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'GitPlumbers',
      url: 'https://gitplumbers.com/',
      logo: 'https://gitplumbers.com/logo.png',
      sameAs: [
        'https://www.linkedin.com/company/gitplumbers/',
        'https://twitter.com/gitplumbers'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        url: 'https://gitplumbers.com/contact/'
      }
    };
  }

  generateArticleSchema(post: BlogPost): object {
    const baseSchema = {
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
      mainEntityOfPage: `https://gitplumbers.com/blog/${post.slug}/`,
      datePublished: post.publishedOn,
      dateModified: post.publishedOn
    };

    // Add author if available
    if (post.author) {
      (baseSchema as any).author = {
        '@type': 'Person',
        name: post.author.name,
        ...(post.author.title && { jobTitle: post.author.title }),
        ...(post.author.url && { url: post.author.url })
      };
    }

    // Add article section if available
    if (post.schemaHints?.articleSection) {
      (baseSchema as any).articleSection = post.schemaHints.articleSection;
    }

    return baseSchema;
  }

  generateFAQSchema(post: BlogPost): object | null {
    if (!post.faq || post.faq.length === 0) {
      return null;
    }

    return {
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
  }

  // Helper method to render internal links with proper tracking
  renderInternalLink(link: InternalLink, postSlug: string): string {
    const utmParams = `utm_source=blog&utm_medium=internal_link&utm_campaign=${postSlug}`;
    const separator = link.href.includes('?') ? '&' : '?';
    return `${link.href}${separator}${utmParams}`;
  }

  // Helper method to render CTA with proper tracking
  renderCTA(cta: CTA, postSlug: string): string {
    const baseUtm = `utm_source=blog&utm_medium=cta&utm_campaign=${postSlug}`;
    const existingUtm = cta.utm || '';
    const separator = cta.href.includes('?') ? '&' : '?';
    
    if (existingUtm) {
      return `${cta.href}${separator}${existingUtm}&${baseUtm}`;
    }
    return `${cta.href}${separator}${baseUtm}`;
  }
}
