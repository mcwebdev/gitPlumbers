import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title, type MetaDefinition } from '@angular/platform-browser';
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
    ogImage: 'https://gitplumbers.com/site-promo.png',
    ogUrl: 'https://gitplumbers.com/',
    twitterCard: 'summary_large_image',
    twitterTitle: 'GitPlumbers - Transform AI Code Chaos into Clean Applications',
    twitterDescription:
      'Stop shipping fragile AI-generated code. Our expert network optimizes React, Angular, Vue, Node.js & Python applications for enterprise scale.',
    twitterImage: 'https://gitplumbers.com/site-promo.png',
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

    // Ensure canonical URL and og:url are consistent
    const canonicalUrl = this.resolveCanonical(finalMetadata.canonical ?? finalMetadata.ogUrl);
    finalMetadata.canonical = canonicalUrl;
    finalMetadata.ogUrl = canonicalUrl; // Make sure og:url matches canonical

    // Set title first
    this._title.setTitle(finalMetadata.title);

    this.applyMetaTags(finalMetadata);
  }

  private applyMetaTags(finalMetadata: SeoMetadata): void {
    const managedMetaTags: HTMLMetaElement[] = [];
    const trackMeta = (
      definition: Pick<MetaDefinition, 'name' | 'property'>,
      value?: string | null
    ): void => {
      const element = this.upsertMeta(definition, value);
      if (element) {
        managedMetaTags.push(element);
      }
    };

    const robotsContent = this.buildRobotsContent(
      finalMetadata.robotsIndex,
      finalMetadata.robotsFollow
    );

    trackMeta({ name: 'description' }, finalMetadata.description);
    trackMeta({ name: 'author' }, finalMetadata.articleAuthor || 'GitPlumbers');
    trackMeta({ name: 'robots' }, robotsContent);

    // Application & platform tags
    trackMeta({ name: 'theme-color' }, '#1976d2');
    trackMeta({ name: 'format-detection' }, 'telephone=no');
    trackMeta({ name: 'mobile-web-app-capable' }, 'yes');
    trackMeta({ name: 'apple-mobile-web-app-capable' }, 'yes');
    trackMeta({ name: 'apple-mobile-web-app-status-bar-style' }, 'default');
    trackMeta({ name: 'apple-mobile-web-app-title' }, 'GitPlumbers');
    trackMeta({ name: 'application-name' }, 'GitPlumbers');
    trackMeta({ name: 'msapplication-TileColor' }, '#1976d2');
    trackMeta({ name: 'msapplication-config' }, '/browserconfig.xml');
    trackMeta({ name: 'msapplication-tooltip' }, 'GitPlumbers - AI Code Optimization');
    trackMeta({ name: 'msapplication-starturl' }, '/');

    // Open Graph tags
    const ogType = finalMetadata.ogType ?? 'website';
    trackMeta({ property: 'og:type' }, ogType);
    trackMeta({ property: 'og:title' }, finalMetadata.ogTitle || finalMetadata.title);
    trackMeta(
      { property: 'og:description' },
      finalMetadata.ogDescription || finalMetadata.description
    );
    trackMeta({ property: 'og:image' }, finalMetadata.ogImage || this.defaultMetadata.ogImage);
    trackMeta({ property: 'og:url' }, finalMetadata.ogUrl || finalMetadata.canonical);
    trackMeta({ property: 'og:site_name' }, 'GitPlumbers');
    trackMeta({ property: 'og:locale' }, 'en_US');

    const includeArticleTags = ogType === 'article';
    if (includeArticleTags) {
      trackMeta({ property: 'article:section' }, finalMetadata.articleSection);
      trackMeta({ property: 'article:author' }, finalMetadata.articleAuthor);
      trackMeta({ property: 'article:published_time' }, finalMetadata.articlePublishedTime);
      trackMeta({ property: 'article:modified_time' }, finalMetadata.articleModifiedTime);
    } else {
      this.upsertMeta({ property: 'article:section' });
      this.upsertMeta({ property: 'article:author' });
      this.upsertMeta({ property: 'article:published_time' });
      this.upsertMeta({ property: 'article:modified_time' });
    }

    // Twitter tags
    const twitterCard = finalMetadata.twitterCard ?? 'summary_large_image';
    const twitterImage = finalMetadata.twitterImage || finalMetadata.ogImage;

    trackMeta({ name: 'twitter:card' }, twitterCard);
    trackMeta({ name: 'twitter:title' }, finalMetadata.twitterTitle || finalMetadata.title);
    trackMeta(
      { name: 'twitter:description' },
      finalMetadata.twitterDescription || finalMetadata.description
    );
    trackMeta({ name: 'twitter:image' }, twitterImage || this.defaultMetadata.twitterImage);
    trackMeta({ name: 'twitter:site' }, '@gitplumbers');
    trackMeta({ name: 'twitter:creator' }, '@gitplumbers');

    this.setCanonicalLink(finalMetadata.canonical!);

    this.positionSeoMetaTags(managedMetaTags);
  }

  private buildRobotsContent(index?: boolean, follow?: boolean): string {
    const indexValue = index !== false ? 'index' : 'noindex';
    const followValue = follow !== false ? 'follow' : 'nofollow';
    return `${indexValue}, ${followValue}`;
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
    this._currentCanonical = url;

    let linkElement = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkElement) {
      const viewportMeta = head.querySelector('meta[name="viewport"]');
      linkElement = this._document.createElement('link');
      linkElement.setAttribute('rel', 'canonical');

      if (viewportMeta?.parentNode) {
        viewportMeta.parentNode.insertBefore(linkElement, viewportMeta.nextSibling);
      } else {
        head.appendChild(linkElement);
      }
    }

    linkElement.setAttribute('href', url);
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
      ogImage: 'https://gitplumbers.com/site-promo.png',
      twitterCard: 'summary_large_image',
      twitterTitle: aiOptimizedTitle,
      twitterDescription: aiOptimizedDescription,
      canonical: canonicalUrl,
      robotsIndex: true,
      robotsFollow: true,
    };
  }

  /**
   * Optimize title for AI search engines and social media
   */
  private optimizeForAi(title: string, keywords: string[]): string {
    const primaryKeyword = keywords[0];
    let optimizedTitle = title;

    // Ensure primary keyword is in title
    if (!title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      optimizedTitle = `${primaryKeyword}: ${title}`;
    }

    // Add GitPlumbers brand for authority
    if (!optimizedTitle.includes('GitPlumbers')) {
      optimizedTitle = `${optimizedTitle} | GitPlumbers`;
    }

    // Optimize for social media (Twitter limit ~100 chars, but aim for ~90 for safety)
    if (optimizedTitle.length > 90) {
      // Try to shorten while keeping key terms
      const brandSuffix = ' | GitPlumbers';
      const maxContentLength = 90 - brandSuffix.length;
      
      if (title.length > maxContentLength) {
        // Truncate title and add ellipsis
        optimizedTitle = title.substring(0, maxContentLength - 3) + '...' + brandSuffix;
      }
    }

    return optimizedTitle;
  }

  /**
   * Optimize description for AI understanding, citation, and social media
   */
  private optimizeDescriptionForAi(description: string, keywords: string[]): string {
    const primaryKeyword = keywords[0];
    let optimizedDescription = description;

    // Ensure description starts with primary keyword for better AI understanding
    if (!description.toLowerCase().startsWith(primaryKeyword.toLowerCase())) {
      optimizedDescription = `${primaryKeyword}: ${description}`;
    }

    // Add authority signals that AI models value
    if (!optimizedDescription.includes('expert') && !optimizedDescription.includes('proven')) {
      optimizedDescription = `${optimizedDescription} Expert insights from senior developers with proven results.`;
    }

    // Optimize for social media and search engines
    // Google truncates at ~160 chars, Twitter at ~200, aim for ~155 for safety
    if (optimizedDescription.length > 155) {
      // Find a good breaking point (end of sentence or word)
      const targetLength = 152; // Leave room for "..."
      let truncateAt = targetLength;
      
      // Try to break at end of sentence
      const lastPeriod = optimizedDescription.lastIndexOf('.', targetLength);
      const lastExclamation = optimizedDescription.lastIndexOf('!', targetLength);
      const lastQuestion = optimizedDescription.lastIndexOf('?', targetLength);
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      if (lastSentenceEnd > targetLength - 20) { // If sentence end is close to target
        truncateAt = lastSentenceEnd + 1;
      } else {
        // Break at word boundary
        const lastSpace = optimizedDescription.lastIndexOf(' ', targetLength);
        if (lastSpace > targetLength - 10) {
          truncateAt = lastSpace;
        }
      }
      
      optimizedDescription = optimizedDescription.substring(0, truncateAt).trim();
      // Only add ellipsis if we didn't end at a sentence boundary
      if (!optimizedDescription.endsWith('.') && !optimizedDescription.endsWith('!') && !optimizedDescription.endsWith('?')) {
        optimizedDescription += '...';
      }
    }

    return optimizedDescription;
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

  private upsertMeta(
    definition: Pick<MetaDefinition, 'name' | 'property'>,
    value?: string | null
  ): HTMLMetaElement | null {
    const selector = this.buildSelector(definition);
    const normalized = value === undefined || value === null ? undefined : `${value}`.trim();

    if (!normalized) {
      this._meta.removeTag(selector);
      return null;
    }

    return this._meta.updateTag({ ...definition, content: normalized }, selector) ?? null;
  }

  private buildSelector(definition: Pick<MetaDefinition, 'name' | 'property'>): string {
    if (definition.name) {
      return `name="${definition.name}"`;
    }

    if (definition.property) {
      return `property="${definition.property}"`;
    }

    throw new Error('Meta definition must include a name or property.');
  }

  private positionSeoMetaTags(metaTags: HTMLMetaElement[]): void {
    if (!metaTags.length) {
      return;
    }

    const head = this._document.head;
    const viewportMeta = head.querySelector('meta[name="viewport"]');
    const parent = viewportMeta?.parentNode;

    if (!viewportMeta || !parent) {
      return;
    }

    let anchor: ChildNode | null = viewportMeta.nextSibling;
    for (const tag of metaTags) {
      if (!tag.parentNode || tag.parentNode !== parent) {
        continue;
      }

      if (anchor === tag) {
        anchor = tag.nextSibling;
        continue;
      }

      if (anchor) {
        parent.insertBefore(tag, anchor);
      } else {
        parent.appendChild(tag);
      }

      anchor = tag.nextSibling;
    }
  }
}

