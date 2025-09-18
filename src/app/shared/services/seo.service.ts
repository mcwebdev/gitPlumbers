import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string;
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

  private readonly defaultMetadata: SeoMetadata = {
    title: 'GitPlumbers - Full-Stack Technical Consultancy & Expert Network',
    description:
      'Curated network of senior developers across all frameworks. React, Vue, Angular, Node.js, Python specialists for enterprise modernization and code optimization.',
    keywords:
      'technical consultancy, full stack experts, React consultants, Vue specialists, Angular developers, Node.js experts, Python consultants, enterprise modernization, code review services',
    ogTitle: 'GitPlumbers - Full-Stack Technical Consultancy & Expert Network',
    ogDescription:
      'Curated network of senior developers across all frameworks. React, Vue, Angular, Node.js, Python specialists for enterprise modernization and code optimization.',
    ogImage: 'https://gitplumbers-35d92.firebaseapp.com/logo.png',
    ogUrl: 'https://gitplumbers-35d92.firebaseapp.com',
    twitterCard: 'summary_large_image',
    twitterTitle: 'GitPlumbers - Enterprise Code Optimization & Modernization',
    twitterDescription:
      'Transform AI-generated chaos into clean, scalable applications. Expert code reviews, tech debt resolution, and enterprise modernization services.',
    twitterImage: 'https://gitplumbers-35d92.firebaseapp.com/logo.png',
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
      this.updateTag('keywords', finalMetadata.keywords);
    }

    // Update Open Graph meta tags
    this.updateTag('og:title', finalMetadata.ogTitle || finalMetadata.title, 'property');
    this.updateTag(
      'og:description',
      finalMetadata.ogDescription || finalMetadata.description,
      'property'
    );
    this.updateTag('og:image', finalMetadata.ogImage!, 'property');
    this.updateTag('og:url', finalMetadata.ogUrl!, 'property');
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
    if (!this._isBrowser) return;

    const baseUrl = 'https://gitplumbers-35d92.firebaseapp.com';
    const canonicalUrl = `${baseUrl}${url}`;

    let linkElement = this._document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!linkElement) {
      linkElement = this._document.createElement('link');
      linkElement.setAttribute('rel', 'canonical');
      this._document.head.appendChild(linkElement);
    }
    linkElement.setAttribute('href', canonicalUrl);
  }

  // Predefined metadata for different pages
  getHomePageMetadata(): SeoMetadata {
    return {
      title: 'GitPlumbers - Curated Network of Senior Full-Stack Developers',
      description:
        'Access vetted specialists across React, Vue, Angular, Node.js, Python & more. Scalable technical teams for enterprise modernization. 70% faster delivery, zero hiring overhead.',
      keywords:
        'technical consultancy, React specialists, Vue experts, Angular consultants, Node.js developers, Python experts, full stack teams, enterprise modernization, code optimization',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/',
    };
  }

  getContactPageMetadata(): SeoMetadata {
    return {
      title: 'Contact GitPlumbers - Assemble Your Technical Dream Team',
      description:
        'Ready to scale your development? Get matched with our curated network of React, Vue, Angular, Node.js, and Python specialists for your next project.',
      keywords:
        'contact gitplumbers, technical team assembly, React consultants, Vue specialists, Angular experts, Node.js developers, Python consultants',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/contact',
    };
  }

  getLoginPageMetadata(): SeoMetadata {
    return {
      title: 'Login - GitPlumbers Client Portal',
      description:
        'Access your GitPlumbers client dashboard to track project progress, review reports, and manage your code optimization projects.',
      keywords: 'gitplumbers login, client portal, project dashboard',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/login',
      robotsIndex: false, // Don't index login pages
    };
  }

  getSignupPageMetadata(): SeoMetadata {
    return {
      title: 'Sign Up - Start Your Code Transformation Journey',
      description:
        'Join GitPlumbers and start transforming your codebase today. Get access to expert code reviews, modernization services, and enterprise development.',
      keywords: 'gitplumbers signup, code transformation, software consulting registration',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/signup',
    };
  }
}
