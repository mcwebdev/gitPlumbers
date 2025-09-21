import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div class="not-found-actions">
          <a routerLink="/" class="btn btn-primary">Go Home</a>
          <a routerLink="/blog" class="btn btn-secondary">Browse Blog</a>
          <a routerLink="/services" class="btn btn-secondary">View Services</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      padding: 2rem;
    }
    
    .not-found-content {
      text-align: center;
      max-width: 600px;
    }
    
    .not-found-content h1 {
      font-size: 3rem;
      color: #1976d2;
      margin-bottom: 1rem;
    }
    
    .not-found-content p {
      font-size: 1.2rem;
      color: #666;
      margin-bottom: 2rem;
    }
    
    .not-found-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background-color: #1976d2;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #1565c0;
    }
    
    .btn-secondary {
      background-color: transparent;
      color: #1976d2;
      border: 2px solid #1976d2;
    }
    
    .btn-secondary:hover {
      background-color: #1976d2;
      color: white;
    }
  `]
})
export class NotFoundComponent {
  private readonly _seo = inject(SeoService);

  constructor() {
    this._seo.updateMetadata({
      title: '404 - Page Not Found | GitPlumbers',
      description: 'The page you\'re looking for doesn\'t exist. Return to GitPlumbers homepage or browse our blog and services.',
      robotsIndex: false,
      robotsFollow: false,
    });
  }
}
