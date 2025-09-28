import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string | string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  articleSection?: string;
  articleAuthor?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly _meta = inject(Meta);
  private readonly _title = inject(Title);
  private readonly _router = inject(Router);
  private readonly _document = inject(DOCUMENT) as Document;
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _isBrowser = isPlatformBrowser(this._platformId);
  private readonly _baseUrl = 'https://gitplumbers.com';
  private readonly _defaultCanonical = 'https://gitplumbers.com/';
  private _currentCanonical = 'https://gitplumbers.com/';


  private readonly defaultMetadata: SeoMetadata = {
    title: 'GitPlumbers - AI Code Optimization & Enterprise Modernization Experts',
    description:
      'Transform AI-generated codebases into production-ready applications. Expert network specializing in React, Vue, Angular, Node.js, Python optimization and enterprise modernization.',
    keywords:
      'AI code optimization, enterprise modernization, React performance, Angular optimization, Vue.js scaling, Node.js experts, Python consultants, technical debt resolution, code review services, AI-generated code cleanup',
    ogTitle: 'GitPlumbers - AI Code Optimization & Enterprise Modernization',
    ogDescription:
      'Expert network transforming AI-generated codebases into scalable, production-ready applications. Specialized in React, Vue, Angular, Node.js, and Python optimization.',
    ogImage: 'https://gitplumbers.com/logo.png',
    ogUrl: 'https://gitplumbers.com/',
    twitterCard: 'summary_large_image',
    twitterTitle: 'GitPlumbers - Transform AI Code Chaos into Clean Applications',
    twitterDescription:
      'Stop shipping fragile AI-generated code. Our expert network optimizes React, Angular, Vue, Node.js & Python applications for enterprise scale.',
    twitterImage: 'https://gitplumbers.com/logo.png',
    robotsIndex: true,
    robotsFollow: true,
  };

  constructor() {
    this.initializeRouteTracking();
    this.setDefaultMetadata();
  }

  private initializeRouteTracking(): void {
    if (!this._isBrowser) return;
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.setCanonicalLink(`${this._baseUrl}${event.urlAfterRedirects}`);
      });
  }

  private setDefaultMetadata(): void {
    this.updateMetadata(this.defaultMetadata);
  }

  updateMetadata(metadata: Partial<SeoMetadata>): void {
    const finalMetadata: SeoMetadata = { ...this.defaultMetadata, ...metadata };

    const canonicalUrl = this.resolveCanonical(finalMetadata.canonical ?? finalMetadata.ogUrl);
    finalMetadata.ogUrl = canonicalUrl;
    finalMetadata.canonical = canonicalUrl;

    // Set title first
    this._title.setTitle(finalMetadata.title);

    // Insert essential meta tags in proper order
    this.insertMetaTagsInOrder(finalMetadata);
  }

  private insertMetaTagsInOrder(finalMetadata: SeoMetadata): void {
    // Create and position meta tags directly after the viewport meta tag
    const head = this._document.head;
    const viewportMeta = head.querySelector('meta[name="viewport"]');
    
    // Helper function to create and position meta tags immediately
    const createAndPositionMetaTag = (attributes: Record<string, string>, content: string) => {
      const element = this._document.createElement('meta');
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
      element.setAttribute('content', content);
      
      // Insert after viewport meta tag if it exists, otherwise append to head
      if (viewportMeta && viewportMeta.parentNode) {
        viewportMeta.parentNode.insertBefore(element, viewportMeta.nextSibling);
      } else {
        head.appendChild(element);
      }
    };

    // 1. Essential meta tags (before styles)
    createAndPositionMetaTag({ name: 'description' }, finalMetadata.description);

    if (finalMetadata.keywords) {
      const keywordContent = Array.isArray(finalMetadata.keywords)
        ? finalMetadata.keywords.join(', ')
        : finalMetadata.keywords;
      createAndPositionMetaTag({ name: 'keywords' }, keywordContent);
    }

    createAndPositionMetaTag({ name: 'author' }, 'GitPlumbers');

    const robotsContent = this.buildRobotsContent(
      finalMetadata.robotsIndex,
      finalMetadata.robotsFollow
    );
    createAndPositionMetaTag({ name: 'robots' }, robotsContent);

    createAndPositionMetaTag({ name: 'theme-color' }, '#1976d2');
    createAndPositionMetaTag({ name: 'msapplication-TileColor' }, '#1976d2');
    createAndPositionMetaTag({ name: 'msapplication-config' }, '/browserconfig.xml');
    createAndPositionMetaTag({ name: 'format-detection' }, 'telephone=no');
    createAndPositionMetaTag({ name: 'mobile-web-app-capable' }, 'yes');
    createAndPositionMetaTag({ name: 'apple-mobile-web-app-capable' }, 'yes');
    createAndPositionMetaTag({ name: 'apple-mobile-web-app-status-bar-style' }, 'default');
    createAndPositionMetaTag({ name: 'apple-mobile-web-app-title' }, 'GitPlumbers');
    createAndPositionMetaTag({ name: 'application-name' }, 'GitPlumbers');
    createAndPositionMetaTag({ name: 'msapplication-tooltip' }, 'GitPlumbers - AI Code Optimization');
    createAndPositionMetaTag({ name: 'msapplication-starturl' }, '/');

    // 2. Open Graph tags
    const ogType = finalMetadata.ogType ?? 'website';
    createAndPositionMetaTag({ property: 'og:type' }, ogType);
    createAndPositionMetaTag({ property: 'og:title' }, finalMetadata.ogTitle || finalMetadata.title);
    createAndPositionMetaTag({ property: 'og:description' }, finalMetadata.ogDescription || finalMetadata.description);
    createAndPositionMetaTag({ property: 'og:image' }, finalMetadata.ogImage!);
    createAndPositionMetaTag({ property: 'og:url' }, finalMetadata.ogUrl!);
    createAndPositionMetaTag({ property: 'og:site_name' }, 'GitPlumbers');

    // 3. Article-specific tags (if applicable)
    if (ogType === 'article' && finalMetadata.articleSection) {
      createAndPositionMetaTag({ property: 'article:section' }, finalMetadata.articleSection);
    }
    if (ogType === 'article' && finalMetadata.articleAuthor) {
      createAndPositionMetaTag({ property: 'article:author' }, finalMetadata.articleAuthor);
    }
    if (ogType === 'article' && finalMetadata.articlePublishedTime) {
      createAndPositionMetaTag({ property: 'article:published_time' }, finalMetadata.articlePublishedTime);
    }
    if (ogType === 'article' && finalMetadata.articleModifiedTime) {
      createAndPositionMetaTag({ property: 'article:modified_time' }, finalMetadata.articleModifiedTime);
    }

    // 4. Twitter tags
    createAndPositionMetaTag({ name: 'twitter:card' }, finalMetadata.twitterCard!);
    createAndPositionMetaTag({ name: 'twitter:title' }, finalMetadata.twitterTitle || finalMetadata.title);
    createAndPositionMetaTag({ name: 'twitter:description' }, finalMetadata.twitterDescription || finalMetadata.description);
    createAndPositionMetaTag({ name: 'twitter:image' }, finalMetadata.twitterImage || finalMetadata.ogImage!);
    createAndPositionMetaTag({ name: 'twitter:site' }, '@gitplumbers');
    createAndPositionMetaTag({ name: 'twitter:creator' }, '@gitplumbers');

    // 5. Canonical link
    this.setCanonicalLink(finalMetadata.canonical!);

    // Add HTML comments for better organization
    this.addOrganizationComments();
  }


  private addOrganizationComments(): void {
    if (!this._isBrowser) return; // Only add comments in browser for better readability

    const head = this._document.head;
    if (!head) return;

    // Find Open Graph tags and add comment before them
    const firstOgTag = head.querySelector('meta[property="og:type"]');
    if (firstOgTag) {
      const comment = this._document.createComment(' Open Graph / Facebook ');
      firstOgTag.parentNode?.insertBefore(comment, firstOgTag);
    }

    // Find Twitter tags and add comment before them
    const firstTwitterTag = head.querySelector('meta[name="twitter:card"]');
    if (firstTwitterTag) {
      const comment = this._document.createComment(' Twitter ');
      firstTwitterTag.parentNode?.insertBefore(comment, firstTwitterTag);
    }

    // Find canonical link and add comment before it
    const canonicalLink = head.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      const comment = this._document.createComment(' Canonical URL ');
      canonicalLink.parentNode?.insertBefore(comment, canonicalLink);
    }
  }

  private buildRobotsContent(index?: boolean, follow?: boolean): string {
    const indexValue = index !== false ? 'index' : 'noindex';
    const followValue = follow !== false ? 'follow' : 'nofollow';
    return `${indexValue}, ${followValue}`;
  }

  private updateCanonicalUrl(url: string): void {
    const canonicalUrl = this.resolveCanonical(url);
    this.setCanonicalLink(canonicalUrl);
  }

  private resolveCanonical(target?: string): string {
    const trimmed = (target ?? '').trim();
    if (!trimmed) {
      return this._defaultCanonical;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return this.normalizeCanonical(trimmed);
    }

    const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return this.normalizeCanonical(`${this._baseUrl}${relativePath}`);
  }

  private normalizeCanonical(url: string): string {
    try {
      const parsed = new URL(url);
      if (!parsed.pathname || parsed.pathname === '') {
        parsed.pathname = '/';
      }

      if (this.shouldAppendTrailingSlash(parsed.pathname)) {
        parsed.pathname = parsed.pathname.endsWith('/')
          ? parsed.pathname
          : `${parsed.pathname}/`;
      }

      return parsed.toString();
    } catch {
      if (!url) {
        return this._defaultCanonical;
      }

      const lastSegment = url.split('/').pop() ?? '';
      if (url.endsWith('/') || url.includes('?') || url.includes('#') || lastSegment.includes('.')) {
        return url;
      }

      return `${url}/`;
    }
  }

  private shouldAppendTrailingSlash(pathname: string): boolean {
    if (!pathname || pathname === '/' || pathname.endsWith('/')) {
      return false;
    }

    const segments = pathname.split('/').filter((segment) => segment.length > 0);
    const lastSegment = segments.length ? segments[segments.length - 1] : '';
    return lastSegment.length > 0 && !lastSegment.includes('.');
  }

  private setCanonicalLink(url: string): void {
    if (!url) {
      return;
    }
    // Allow canonical link updates during SSR for proper SEO
    // if (!this._isBrowser) {
    //   return;
    // }

    const head = this._document.head;
    
    // Remove all existing canonical links to prevent duplicates
    const existingCanonicalLinks = head.querySelectorAll('link[rel="canonical"]');
    existingCanonicalLinks.forEach(link => link.remove());
    
    // Also remove any meta tags with rel="canonical" (incorrect usage)
    const existingCanonicalMetas = head.querySelectorAll('meta[rel="canonical"]');
    existingCanonicalMetas.forEach(meta => meta.remove());

    // Find the viewport meta tag to insert canonical link after it
    const viewportMeta = head.querySelector('meta[name="viewport"]');
    
    // Create new canonical link
    const linkElement = this._document.createElement('link');
    linkElement.setAttribute('rel', 'canonical');
    linkElement.setAttribute('href', url);
    
    // Insert after viewport meta tag if it exists, otherwise append to head
    if (viewportMeta && viewportMeta.parentNode) {
      viewportMeta.parentNode.insertBefore(linkElement, viewportMeta.nextSibling);
    } else {
      head.appendChild(linkElement);
    }
  }

  // Predefined metadata for different pages
  getHomePageMetadata(): SeoMetadata {
    return {
      title: 'GitPlumbers - Curated Network of Senior Full-Stack Developers',
      description:
        'Access vetted specialists across React, Vue, Angular, Node.js, Python & more. Scalable technical teams for enterprise modernization. 70% faster delivery, zero hiring overhead.',
      keywords:
        'technical consultancy, React specialists, Vue experts, Angular consultants, Node.js developers, Python experts, full stack teams, enterprise modernization, code optimization',
      ogUrl: 'https://gitplumbers.com/',
    };
  }

  getContactPageMetadata(): SeoMetadata {
    return {
      title: 'Contact GitPlumbers - Assemble Your Technical Dream Team',
      description:
        'Ready to scale your development? Get matched with our curated network of React, Vue, Angular, Node.js, and Python specialists for your next project.',
      keywords:
        'contact gitplumbers, technical team assembly, React consultants, Vue specialists, Angular experts, Node.js developers, Python consultants',
      ogUrl: 'https://gitplumbers.com/contact/',
    };
  }

  getLoginPageMetadata(): SeoMetadata {
    return {
      title: 'Login - GitPlumbers Client Portal',
      description:
        'Access your GitPlumbers client dashboard to track project progress, review reports, and manage your code optimization projects.',
      keywords: 'gitplumbers login, client portal, project dashboard',
      ogUrl: 'https://gitplumbers.com/login/',
      robotsIndex: false, // Don't index login pages
    };
  }

  getSignupPageMetadata(): SeoMetadata {
    return {
      title: 'Sign Up - Start Your Code Transformation Journey',
      description:
        'Join GitPlumbers and start transforming your codebase today. Get access to expert code reviews, modernization services, and enterprise development.',
      keywords: 'gitplumbers signup, code transformation, software consulting registration',
      ogUrl: 'https://gitplumbers.com/signup/',
    };
  }

  /**
   * Generate metadata optimized for AI search engines and LLMs
   */
  generateAiOptimizedMetadata(content: {
    title: string;
    description: string;
    keywords: string[];
    category?: string;
    author?: string;
    publishedAt?: Date;
    url: string;
  }): SeoMetadata {
    const aiOptimizedTitle = this.optimizeForAi(content.title, content.keywords);
    const aiOptimizedDescription = this.optimizeDescriptionForAi(
      content.description,
      content.keywords
    );
    const canonicalUrl = this.resolveCanonical(content.url);

    return {
      title: aiOptimizedTitle,
      description: aiOptimizedDescription,
      keywords: content.keywords.join(', '),
      ogTitle: aiOptimizedTitle,
      ogDescription: aiOptimizedDescription,
      ogUrl: canonicalUrl,
      ogImage: 'https://gitplumbers.com/logo.png',
      twitterCard: 'summary_large_image',
      twitterTitle: aiOptimizedTitle,
      twitterDescription: aiOptimizedDescription,
      canonical: canonicalUrl,
      robotsIndex: true,
      robotsFollow: true,
    };
  }

  /**
   * Optimize title for AI search engines
   */
  private optimizeForAi(title: string, keywords: string[]): string {
    const primaryKeyword = keywords[0];

    // Ensure primary keyword is in title
    if (!title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      return `${primaryKeyword}: ${title} | GitPlumbers`;
    }

    // Add GitPlumbers brand for authority
    if (!title.includes('GitPlumbers')) {
      return `${title} | GitPlumbers Expert Guide`;
    }

    return title;
  }

  /**
   * Optimize description for AI understanding and citation
   */
  private optimizeDescriptionForAi(description: string, keywords: string[]): string {
    const primaryKeyword = keywords[0];

    // Ensure description starts with primary keyword for better AI understanding
    if (!description.toLowerCase().startsWith(primaryKeyword.toLowerCase())) {
      return `${primaryKeyword}: ${description}`;
    }

    // Add authority signals that AI models value
    if (!description.includes('expert') && !description.includes('proven')) {
      return `${description} Expert insights from senior developers with proven results.`;
    }

    return description;
  }

  /**
   * Generate FAQ schema for better AI question answering
   */
  generateFaqSchema(faqs: { question: string; answer: string }[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }

  /**
   * Add structured data to page for better AI understanding
   */
  addStructuredData(schema: Record<string, unknown>, options: { identifier?: string } = {}): void {
    // Allow structured data updates during SSR for proper SEO
    // if (!this._isBrowser) {
    //   return;
    // }

    const identifier = options.identifier ?? 'seo-structured-data';
    const selector = `script[type="application/ld+json"][data-seo-id="${identifier}"]`;
    const serialized = JSON.stringify(schema);

    // Debug logging
    if (!this._isBrowser) {
      console.log(`SEO SSR: Adding structured data with identifier: ${identifier}`);
      console.log(`SEO SSR: Schema type: ${schema['@type'] || 'unknown'}`);
    }

    const existingScript = this._document.querySelector(
      selector
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.textContent = serialized;
      if (!this._isBrowser) {
        console.log(`SEO SSR: Updated existing structured data script: ${identifier}`);
      }
      return;
    }

    const script = this._document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-id', identifier);
    script.textContent = serialized;
    this._document.head.appendChild(script);
    
    if (!this._isBrowser) {
      console.log(`SEO SSR: Created new structured data script: ${identifier}`);
    }
  }

  /**
   * Remove structured data by identifier
   */
  removeStructuredData(identifier: string): void {
    // Allow structured data removal during SSR for proper SEO
    // if (!this._isBrowser) {
    //   return;
    // }

    const selector = `script[type="application/ld+json"][data-seo-id="${identifier}"]`;
    const existingScript = this._document.querySelector(selector);
    if (existingScript) {
      existingScript.remove();
    }
  }
}

