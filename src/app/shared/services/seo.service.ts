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
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
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
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateCanonicalUrl(event.urlAfterRedirects);
      });
  }

  private setDefaultMetadata(): void {
    this.updateMetadata(this.defaultMetadata);
  }

  updateMetadata(metadata: Partial<SeoMetadata>): void {
    const finalMetadata: SeoMetadata = { ...this.defaultMetadata, ...metadata };

    // Update title
    this._title.setTitle(finalMetadata.title);

    // Update basic meta tags
    this.updateTag('description', finalMetadata.description);
    if (finalMetadata.keywords) {
      const keywordContent = Array.isArray(finalMetadata.keywords)
        ? finalMetadata.keywords.join(', ')
        : finalMetadata.keywords;
      this.updateTag('keywords', keywordContent);
    }

    const canonicalUrl = this.resolveCanonical(finalMetadata.canonical ?? finalMetadata.ogUrl);
    this.applyCanonicalLink(canonicalUrl);

    // Update Open Graph meta tags
    this.updateTag('og:title', finalMetadata.ogTitle || finalMetadata.title, 'property');
    this.updateTag(
      'og:description',
      finalMetadata.ogDescription || finalMetadata.description,
      'property'
    );
    this.updateTag('og:image', finalMetadata.ogImage!, 'property');
    this.updateTag('og:url', canonicalUrl, 'property');
    this.updateTag('og:type', 'website', 'property');
    this.updateTag('og:site_name', 'GitPlumbers', 'property');

    // Update Twitter Card meta tags
    this.updateTag('twitter:card', finalMetadata.twitterCard!);
    this.updateTag('twitter:title', finalMetadata.twitterTitle || finalMetadata.title);
    this.updateTag(
      'twitter:description',
      finalMetadata.twitterDescription || finalMetadata.description
    );
    this.updateTag('twitter:image', finalMetadata.twitterImage || finalMetadata.ogImage!);
    this.updateTag('twitter:site', '@gitplumbers');
    this.updateTag('twitter:creator', '@gitplumbers');

    // Update robots meta tag
    const robotsContent = this.buildRobotsContent(
      finalMetadata.robotsIndex,
      finalMetadata.robotsFollow
    );
    this.updateTag('robots', robotsContent);

    // Update viewport for mobile optimization
    this.updateTag('viewport', 'width=device-width, initial-scale=1');

    // Add additional SEO meta tags
    this.updateTag('author', 'GitPlumbers');
    this.updateTag('theme-color', '#1976d2');
    this.updateTag('msapplication-TileColor', '#1976d2');
  }

  private updateTag(name: string, content: string, attribute: string = 'name'): void {
    if (this._meta.getTag(`${attribute}="${name}"`)) {
      this._meta.updateTag({ [attribute]: name, content });
    } else {
      this._meta.addTag({ [attribute]: name, content });
    }
  }

  private buildRobotsContent(index?: boolean, follow?: boolean): string {
    const indexValue = index !== false ? 'index' : 'noindex';
    const followValue = follow !== false ? 'follow' : 'nofollow';
    return `${indexValue}, ${followValue}`;
  }

  private updateCanonicalUrl(url: string): void {
    const canonicalUrl = this.resolveCanonical(url);
    this.applyCanonicalLink(canonicalUrl);
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

  private applyCanonicalLink(url: string): void {
    const headElement =
      this._document.head ??
      (this._document.getElementsByTagName('head').item(0) as HTMLHeadElement | null);

    if (!headElement) {
      return;
    }

    let linkElement = headElement.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkElement) {
      linkElement = this._document.createElement('link') as HTMLLinkElement;
      linkElement.setAttribute('rel', 'canonical');
      headElement.appendChild(linkElement);
    } else if (!linkElement.parentNode) {
      headElement.appendChild(linkElement);
    }

    if (linkElement.getAttribute('href') === url && this._currentCanonical === url) {
      return;
    }

    linkElement.setAttribute('href', url);
    this._currentCanonical = url;
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
  addStructuredData(schema: Record<string, unknown>): void {
    if (!this._isBrowser) return;

    // Remove existing structured data
    const existingScript = this._document.querySelector(
      'script[type="application/ld+json"][data-dynamic]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = this._document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-dynamic', 'true');
    script.textContent = JSON.stringify(schema);
    this._document.head.appendChild(script);
  }
}

