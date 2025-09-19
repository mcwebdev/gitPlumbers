import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface AiTrafficEvent {
  eventType:
    | 'ai_traffic'
    | 'page_view'
    | 'conversion'
    | 'engagement'
    | 'ai_citation'
    | 'search_performance';
  eventName?: string;
  data: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AiTrafficAnalytics {
  totalAiVisits: number;
  aiSources: Record<
    string,
    {
      visits: number;
      conversions: number;
      avgSessionDuration: number;
      topPages: string[];
    }
  >;
  topQueries: Array<{
    query: string;
    count: number;
    conversionRate: number;
  }>;
  performanceMetrics: {
    aiTrafficConversionRate: number;
    organicTrafficConversionRate: number;
    aiTrafficBounceRate: number;
    organicTrafficBounceRate: number;
  };
}

export interface DailyMetrics {
  date: string;
  totalEvents: number;
  aiTrafficEvents: number;
  conversionEvents: number;
  sources: Record<string, number>;
  topPages: Record<string, number>;
  queries: Record<string, number>;
}

export interface AiCitation {
  platform: string;
  content: string;
  url: string;
  query?: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

export interface AiAnalyticsDashboard {
  summary: {
    totalAiTraffic: number;
    totalConversions: number;
    topAiSources: Array<{ source: string; visits: number }>;
    growthTrend: number;
  };
  dailyMetrics: DailyMetrics[];
  recentCitations: AiCitation[];
  performanceInsights: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AiAnalyticsService {
  private readonly _http = inject(HttpClient);

  // Firebase Functions base URL - adjust based on your deployment
  private readonly baseUrl = 'https://us-central1-gitplumbers-35d92.cloudfunctions.net';

  /**
   * Track an AI traffic event
   */
  trackAiEvent(event: AiTrafficEvent): Observable<{ success: boolean; eventId: string }> {
    return this._http
      .post<{ success: boolean; eventId: string }>(`${this.baseUrl}/handleAiAnalytics`, event)
      .pipe(
        catchError((error) => {
          console.error('Failed to track AI event:', error);
          return of({ success: false, eventId: '' });
        })
      );
  }

  /**
   * Track an AI citation
   */
  trackCitation(
    platform: string,
    content: string,
    url: string,
    query?: string
  ): Observable<{ success: boolean }> {
    return this._http
      .post<{ success: boolean }>(`${this.baseUrl}/trackAiCitation`, {
        platform,
        content,
        url,
        query,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to track citation:', error);
          return of({ success: false });
        })
      );
  }

  /**
   * Get analytics dashboard data
   */
  getDashboard(): Observable<AiAnalyticsDashboard> {
    return this._http.get<AiAnalyticsDashboard>(`${this.baseUrl}/getAiAnalyticsDashboard`).pipe(
      catchError((error) => {
        console.error('Failed to load dashboard:', error);
        return of({
          summary: {
            totalAiTraffic: 0,
            totalConversions: 0,
            topAiSources: [],
            growthTrend: 0,
          },
          dailyMetrics: [],
          recentCitations: [],
          performanceInsights: [],
        });
      })
    );
  }

  /**
   * Get analytics report for a specific period
   */
  getAnalyticsReport(
    startDate?: string,
    endDate?: string,
    type?: string
  ): Observable<{
    success: boolean;
    period: { start: string; end: string };
    totalEvents: number;
    analytics: AiTrafficAnalytics;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (type) params.append('type', type);

    return this._http
      .get<{
        success: boolean;
        period: { start: string; end: string };
        totalEvents: number;
        analytics: AiTrafficAnalytics;
      }>(`${this.baseUrl}/handleAiAnalytics?${params.toString()}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to get analytics report:', error);
          return of({
            success: false,
            period: { start: '', end: '' },
            totalEvents: 0,
            analytics: {
              totalAiVisits: 0,
              aiSources: {},
              topQueries: [],
              performanceMetrics: {
                aiTrafficConversionRate: 0,
                organicTrafficConversionRate: 0,
                aiTrafficBounceRate: 0,
                organicTrafficBounceRate: 0,
              },
            },
          });
        })
      );
  }

  /**
   * Track page view with AI detection
   */
  trackPageView(url: string, isAiTraffic: boolean = false, source?: string): void {
    const event: AiTrafficEvent = {
      eventType: 'page_view',
      data: {
        isAiTraffic,
        source: source || 'organic',
        url,
      },
      timestamp: new Date().toISOString(),
      url,
    };

    this.trackAiEvent(event).subscribe();
  }

  /**
   * Track conversion event
   */
  trackConversion(url: string, isAiTraffic: boolean = false, source?: string): void {
    const event: AiTrafficEvent = {
      eventType: 'conversion',
      data: {
        isAiTraffic,
        source: source || 'organic',
        url,
      },
      timestamp: new Date().toISOString(),
      url,
    };

    this.trackAiEvent(event).subscribe();
  }
}
