import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { filter, debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Observable } from 'rxjs';
import { UserVisitInfo, FirebaseFunctionResponse } from '../types/analytics-types';

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
  private readonly _httpClient = inject(HttpClient);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _isBrowser = isPlatformBrowser(this._platformId);
  private initialized = false;
  private _emailSent = false;
  private readonly _routeSubject = new Subject<string>();

  constructor() {
    this.initializeGoogleAnalytics();
    this.trackRouteChanges();

    // Initialize email tracking in browser environment
    if (this._isBrowser) {
      this._initializeEmailTracking();
    }
  }

  /**
   * Initialize email-based analytics tracking
   */
  private _initializeEmailTracking(): void {
    // Send initial visit email only once
    if (!this._emailSent) {
      this._trackInitialVisit();
      this._emailSent = true;
    }

    // Track navigation events with debouncing
    this._routeSubject
      .pipe(
        debounceTime(1000),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe((route: string) => {
        this._trackRouteChangeViaEmail(route);
      });
  }

  /**
   * Track initial user visit with minimal data collection
   */
  private _trackInitialVisit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const visitInfo: UserVisitInfo = this._collectMinimalUserInfo(
      window.location.pathname
    );
    this._sendAnalyticsEmail(visitInfo);
  }

  /**
   * Track route changes via email
   */
  private _trackRouteChangeViaEmail(route: string): void {
    const routeInfo: UserVisitInfo = this._collectMinimalUserInfo(route);
    this._sendAnalyticsEmail(routeInfo);
  }

  /**
   * Collect minimal user information for analytics (privacy-focused)
   */
  private _collectMinimalUserInfo(url: string): UserVisitInfo {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        userAgent: 'SSR',
        platform: 'SSR',
        language: 'en',
        screenWidth: 0,
        screenHeight: 0,
        pageUrl: url,
        app: 'gitPlumbers',
      };
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pageUrl: url,
      app: 'gitPlumbers',
    };
  }

  /**
   * Send analytics email via Firebase Function
   */
  private _sendAnalyticsEmail(info: UserVisitInfo): void {
    const emailObservable: Observable<FirebaseFunctionResponse> =
      this._httpClient.post<FirebaseFunctionResponse>(
        'https://us-central1-angularux.cloudfunctions.net/sendUserVisitEmail',
        info
      );

    emailObservable.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        console.log('Analytics email sent successfully');
      },
      error: (error: Error) => {
        console.error('Failed to send analytics email:', error);
      },
    });
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
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
        // Also trigger email tracking via subject
        this._routeSubject.next(event.urlAfterRedirects);
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

  /**
   * Manually trigger email analytics for a specific event
   */
  trackEmailEvent(
    eventName: string,
    additionalData?: Record<string, unknown>
  ): void {
    if (!this._isBrowser) {
      return;
    }

    const eventInfo: UserVisitInfo = {
      ...this._collectMinimalUserInfo(window.location.pathname),
      eventName,
      ...additionalData,
    };
    this._sendAnalyticsEmail(eventInfo);
  }
}
