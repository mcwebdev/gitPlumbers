import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface AiTrafficSource {
  source: 'chatgpt' | 'claude' | 'perplexity' | 'bard' | 'copilot' | 'other_ai';
  referrer: string;
  query?: string;
  timestamp: Date;
}

export interface AiTrafficMetrics {
  totalAiVisits: number;
  aiConversionRate: number;
  topAiSources: { source: string; visits: number; conversionRate: number }[];
  aiVsOrganicPerformance: {
    aiTraffic: { visits: number; bounceRate: number; avgSessionDuration: number };
    organicTraffic: { visits: number; bounceRate: number; avgSessionDuration: number };
  };
}

@Injectable({ providedIn: 'root' })
export class AiTrafficTrackingService {
  private readonly _document = inject(DOCUMENT);
  private readonly _router = inject(Router);
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _isBrowser = isPlatformBrowser(this._platformId);

  private aiReferrerPatterns = {
    chatgpt: ['chat.openai.com', 'chatgpt.com'],
    claude: ['claude.ai', 'anthropic.com'],
    perplexity: ['perplexity.ai'],
    bard: ['bard.google.com', 'gemini.google.com'],
    copilot: ['copilot.microsoft.com', 'bing.com/chat'],
    other_ai: ['you.com', 'character.ai', 'replika.ai'],
  };

  private sessionData = {
    startTime: Date.now(),
    pageViews: 0,
    isAiTraffic: false,
    aiSource: null as string | null,
    conversionEvents: 0,
  };

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking(): void {
    if (!this._isBrowser) return;

    // Track initial page load
    this.trackPageView();

    // Track navigation events
    this._router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.trackPageView();
    });
  }

  /**
   * Check if running on localhost
   */
  private _isLocalhost(): boolean {
    if (!this._isBrowser) {
      return false;
    }
    const hostname = this._document.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  }

  /**
   * Identify if current session is from AI source
   */
  identifyAiTrafficSource(): AiTrafficSource | null {
    if (!this._isBrowser || this._isLocalhost()) return null;

    const referrer = this._document.referrer;
    const urlParams = new URLSearchParams(this._document.location.search);

    // Check referrer against AI patterns
    for (const [source, patterns] of Object.entries(this.aiReferrerPatterns)) {
      if (patterns.some((pattern) => referrer.includes(pattern))) {
        return {
          source: source as AiTrafficSource['source'],
          referrer,
          query: urlParams.get('q') || urlParams.get('query') || undefined,
          timestamp: new Date(),
        };
      }
    }

    // Check for AI-specific URL parameters
    if (
      urlParams.get('utm_source')?.includes('ai') ||
      urlParams.get('utm_medium')?.includes('ai')
    ) {
      return {
        source: 'other_ai',
        referrer,
        query: urlParams.get('q') || urlParams.get('query') || undefined,
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Track page view and identify AI traffic
   */
  private trackPageView(): void {
    if (!this._isBrowser || this._isLocalhost()) return;

    this.sessionData.pageViews++;

    if (this.sessionData.pageViews === 1) {
      // First page view - identify traffic source
      const aiSource = this.identifyAiTrafficSource();
      if (aiSource) {
        this.sessionData.isAiTraffic = true;
        this.sessionData.aiSource = aiSource.source;
        this.sendAiTrafficEvent('ai_session_start', aiSource);
      }
    }

    // Track page view
    this.sendTrackingEvent('page_view', {
      page: this._document.location.pathname,
      isAiTraffic: this.sessionData.isAiTraffic,
      aiSource: this.sessionData.aiSource,
      pageViewNumber: this.sessionData.pageViews,
    });
  }

  /**
   * Track conversion events (contact form, signup, etc.)
   */
  trackConversion(eventName: string, value?: number): void {
    if (!this._isBrowser || this._isLocalhost()) return;

    this.sessionData.conversionEvents++;

    this.sendTrackingEvent('conversion', {
      event: eventName,
      value,
      isAiTraffic: this.sessionData.isAiTraffic,
      aiSource: this.sessionData.aiSource,
      sessionDuration: Date.now() - this.sessionData.startTime,
    });
  }

  /**
   * Track engagement events
   */
  trackEngagement(eventName: string, data: Record<string, unknown> = {}): void {
    if (!this._isBrowser || this._isLocalhost()) return;

    this.sendTrackingEvent('engagement', {
      event: eventName,
      ...data,
      isAiTraffic: this.sessionData.isAiTraffic,
      aiSource: this.sessionData.aiSource,
    });
  }

  /**
   * Send AI-specific tracking event
   */
  private sendAiTrafficEvent(eventName: string, aiSource: AiTrafficSource): void {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        ai_source: aiSource.source,
        ai_referrer: aiSource.referrer,
        ai_query: aiSource.query,
        custom_parameter_1: 'ai_traffic',
      });
    }

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics({
      eventType: 'ai_traffic',
      eventName,
      data: aiSource,
      timestamp: new Date().toISOString(),
      url: this._document.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * Send general tracking event
   */
  private sendTrackingEvent(category: string, data: Record<string, unknown>): void {
    // Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', `${category}_${data['event'] || 'generic'}`, {
        event_category: category,
        ...data,
      });
    }

    // Send to custom analytics
    this.sendToCustomAnalytics({
      eventType: category,
      data,
      timestamp: new Date().toISOString(),
      url: this._document.location.href,
      sessionId: this.generateSessionId(),
    });
  }

  /**
   * Send data to custom analytics endpoint
   */
  private sendToCustomAnalytics(data: Record<string, unknown>): void {
    if (!this._isBrowser) return;

    // Send to Firebase Functions AI analytics endpoint
    const endpoint = 'https://us-central1-gitplumbers-35d92.cloudfunctions.net/handleAiAnalytics';

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((error) => {
    });
  }

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session metrics
   */
  getSessionMetrics(): {
    isAiTraffic: boolean;
    aiSource: string | null;
    pageViews: number;
    sessionDuration: number;
    conversionEvents: number;
  } {
    return {
      isAiTraffic: this.sessionData.isAiTraffic,
      aiSource: this.sessionData.aiSource,
      pageViews: this.sessionData.pageViews,
      sessionDuration: Date.now() - this.sessionData.startTime,
      conversionEvents: this.sessionData.conversionEvents,
    };
  }

  /**
   * Track AI citation or mention
   */
  trackAiCitation(platform: string, content: string, url?: string): void {
    this.sendTrackingEvent('ai_citation', {
      platform,
      content: content.substring(0, 200), // Limit content length
      url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track search query performance for AI optimization
   */
  trackSearchQuery(query: string, resultPosition?: number, clicked?: boolean): void {
    this.sendTrackingEvent('search_performance', {
      query,
      position: resultPosition,
      clicked,
      isAiTraffic: this.sessionData.isAiTraffic,
      aiSource: this.sessionData.aiSource,
    });
  }
}

// Global gtag declaration for TypeScript
declare let gtag: (command: string, targetId: string, config?: Record<string, unknown>) => void;
