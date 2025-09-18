import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

declare let gtag: Function;

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly _router = inject(Router);
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _isBrowser = isPlatformBrowser(this._platformId);
  private initialized = false;

  constructor() {
    this.initializeGoogleAnalytics();
    this.trackRouteChanges();
  }

  private initializeGoogleAnalytics(): void {
    if (!this._isBrowser) return;

    // Add Google Analytics script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    document.head.appendChild(script);

    // Initialize gtag
    script.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      gtag = function () {
        (window as any).dataLayer.push(arguments);
      };
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID', {
        send_page_view: false, // We'll handle page views manually
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure',
      });
      this.initialized = true;
    };
  }

  private trackRouteChanges(): void {
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  trackPageView(url: string): void {
    if (!this._isBrowser || !this.initialized) return;

    gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: url,
      page_title: document.title,
    });
  }

  trackEvent(event: AnalyticsEvent): void {
    if (!this._isBrowser || !this.initialized) return;

    gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.custom_parameters,
    });
  }

  // Predefined tracking methods for common business events
  trackContactFormSubmission(success: boolean): void {
    this.trackEvent({
      action: success ? 'contact_form_success' : 'contact_form_error',
      category: 'engagement',
      label: 'contact_form',
      value: success ? 1 : 0,
    });
  }

  trackFileUpload(fileName: string, fileSize: number): void {
    this.trackEvent({
      action: 'file_upload',
      category: 'engagement',
      label: fileName,
      value: Math.round(fileSize / 1024), // Size in KB
      custom_parameters: {
        file_type: fileName.split('.').pop() || 'unknown',
      },
    });
  }

  trackUserLogin(method: string): void {
    this.trackEvent({
      action: 'login',
      category: 'user_engagement',
      label: method,
    });
  }

  trackUserSignup(method: string): void {
    this.trackEvent({
      action: 'sign_up',
      category: 'user_engagement',
      label: method,
    });
  }

  trackServiceInterest(service: string): void {
    this.trackEvent({
      action: 'service_interest',
      category: 'business',
      label: service,
    });
  }

  trackScrollDepth(depth: number): void {
    this.trackEvent({
      action: 'scroll',
      category: 'engagement',
      label: `${depth}%`,
      value: depth,
    });
  }

  trackOutboundLink(url: string, linkText: string): void {
    this.trackEvent({
      action: 'click',
      category: 'outbound_link',
      label: url,
      custom_parameters: {
        link_text: linkText,
      },
    });
  }

  // Enhanced ecommerce tracking for service inquiries
  trackServiceInquiry(serviceName: string, estimatedValue?: number): void {
    this.trackEvent({
      action: 'begin_checkout',
      category: 'ecommerce',
      label: serviceName,
      value: estimatedValue,
      custom_parameters: {
        currency: 'USD',
        service_type: serviceName,
      },
    });
  }
}
