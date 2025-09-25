import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SitemapGeneratorService } from '../../services/sitemap-generator.service';

interface SitemapStats {
  totalUrls: number;
  blogArticles: number;
  staticPages: number;
  lastGenerated: string;
}

@Component({
  selector: 'app-sitemap-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sitemap-stats">
      <h3>Sitemap Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total URLs:</span>
          <span class="stat-value">{{ stats?.totalUrls || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Blog Articles:</span>
          <span class="stat-value">{{ stats?.blogArticles || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Static Pages:</span>
          <span class="stat-value">{{ stats?.staticPages || 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Last Generated:</span>
          <span class="stat-value">{{ formatDate(stats?.lastGenerated) }}</span>
        </div>
      </div>
      <div class="actions">
        <button (click)="refreshStats()" [disabled]="loading" class="btn btn-primary">
          {{ loading ? 'Refreshing...' : 'Refresh Stats' }}
        </button>
        <a href="/sitemap.xml" target="_blank" class="btn btn-secondary">
          View Sitemap
        </a>
      </div>
    </div>
  `,
  styles: [`
    .sitemap-stats {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .sitemap-stats h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.25rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .stat-label {
      font-weight: 500;
      color: #666;
    }

    .stat-value {
      font-weight: 600;
      color: #333;
      font-size: 1.1rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-primary:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }
  `]
})
export class SitemapStatsComponent implements OnInit {
  private readonly _sitemapService = inject(SitemapGeneratorService);

  stats: SitemapStats | null = null;
  loading = false;

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    try {
      this.loading = true;
      this.stats = await this._sitemapService.getSitemapStats();
    } catch (error) {
      console.error('Error loading sitemap stats:', error);
    } finally {
      this.loading = false;
    }
  }

  async refreshStats(): Promise<void> {
    await this.loadStats();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }
}
