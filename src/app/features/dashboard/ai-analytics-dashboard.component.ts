import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';

import {
  AiAnalyticsService,
  AiAnalyticsDashboard,
  DailyMetrics,
  AiCitation,
} from '../../shared/services/ai-analytics.service';

@Component({
  selector: 'app-ai-analytics-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-analytics-dashboard.component.html',
  styleUrl: './ai-analytics-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAnalyticsDashboardComponent implements OnInit {
  private readonly _aiAnalyticsService = inject(AiAnalyticsService);

  // Loading states
  private readonly _loadingState = signal<boolean>(true);
  private readonly _errorState = signal<string | null>(null);

  // Dashboard data
  private readonly _dashboardData = signal<AiAnalyticsDashboard | null>(null);

  // Computed properties
  protected readonly isLoading = this._loadingState.asReadonly();
  protected readonly error = this._errorState.asReadonly();
  protected readonly dashboard = this._dashboardData.asReadonly();

  // Summary metrics
  protected readonly totalAiTraffic = computed(() => this.dashboard()?.summary.totalAiTraffic ?? 0);
  protected readonly totalConversions = computed(
    () => this.dashboard()?.summary.totalConversions ?? 0
  );
  protected readonly growthTrend = computed(() => this.dashboard()?.summary.growthTrend ?? 0);
  protected readonly topAiSources = computed(() => this.dashboard()?.summary.topAiSources ?? []);

  // Daily metrics for charts
  protected readonly dailyMetrics = computed(() => this.dashboard()?.dailyMetrics ?? []);
  protected readonly recentCitations = computed(() => this.dashboard()?.recentCitations ?? []);
  protected readonly performanceInsights = computed(
    () => this.dashboard()?.performanceInsights ?? []
  );

  // Chart data
  protected readonly chartData = computed(() => {
    const metrics = this.dailyMetrics();
    return {
      labels: metrics.map((m) => new Date(m.date).toLocaleDateString()),
      aiTraffic: metrics.map((m) => m.aiTrafficEvents),
      conversions: metrics.map((m) => m.conversionEvents),
      totalEvents: metrics.map((m) => m.totalEvents),
    };
  });

  // Source breakdown
  protected readonly sourceBreakdown = computed(() => {
    const sources = this.topAiSources();
    return {
      labels: sources.map((s) => s.source),
      data: sources.map((s) => s.visits),
    };
  });

  // Conversion rate
  protected readonly conversionRate = computed(() => {
    const traffic = this.totalAiTraffic();
    const conversions = this.totalConversions();
    return traffic > 0 ? (conversions / traffic) * 100 : 0;
  });

  // Growth trend indicator
  protected readonly growthIndicator = computed(() => {
    const trend = this.growthTrend();
    if (trend > 10) return { class: 'positive', icon: '📈', text: 'Growing' };
    if (trend < -10) return { class: 'negative', icon: '📉', text: 'Declining' };
    return { class: 'stable', icon: '➡️', text: 'Stable' };
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this._loadingState.set(true);
    this._errorState.set(null);

    this._aiAnalyticsService.getDashboard().subscribe({
      next: (data) => {
        this._dashboardData.set(data);
        this._loadingState.set(false);
      },
      error: (error) => {
        this._errorState.set('Failed to load analytics data. Please try again later.');
        this._loadingState.set(false);
      },
    });
  }

  protected refreshDashboard(): void {
    this.loadDashboard();
  }

  protected formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  protected formatPercentage(num: number): string {
    return `${num.toFixed(1)}%`;
  }

  protected formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  protected formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  }

  protected getSourceIcon(source: string): string {
    const icons: Record<string, string> = {
      chatgpt: '🤖',
      claude: '🧠',
      bard: '🎭',
      perplexity: '🔍',
      copilot: '👨‍💻',
      organic: '🌐',
      unknown: '❓',
    };
    return icons[source.toLowerCase()] || '❓';
  }

  protected getSourceColor(source: string): string {
    const colors: Record<string, string> = {
      chatgpt: '#10a37f',
      claude: '#ff6b35',
      bard: '#4285f4',
      perplexity: '#6366f1',
      copilot: '#0078d4',
      organic: '#6b7280',
      unknown: '#9ca3af',
    };
    return colors[source.toLowerCase()] || '#9ca3af';
  }

  protected truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  protected getMaxAiTraffic(): number {
    const metrics = this.dailyMetrics();
    if (metrics.length === 0) return 1;
    return Math.max(...metrics.map((m) => m.aiTrafficEvents), 1);
  }

  protected getMaxConversions(): number {
    const metrics = this.dailyMetrics();
    if (metrics.length === 0) return 1;
    return Math.max(...metrics.map((m) => m.conversionEvents), 1);
  }

  protected getMaxSourceVisits(): number {
    const sources = this.topAiSources();
    if (sources.length === 0) return 1;
    return Math.max(...sources.map((s) => s.visits), 1);
  }

  protected getAiTrafficPercentage(aiTrafficEvents: number): number {
    return (aiTrafficEvents / this.getMaxAiTraffic()) * 100;
  }

  protected getConversionPercentage(conversionEvents: number): number {
    return (conversionEvents / this.getMaxConversions()) * 100;
  }

  protected getSourcePercentage(visits: number): number {
    return (visits / this.getMaxSourceVisits()) * 100;
  }

  protected getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }
}
