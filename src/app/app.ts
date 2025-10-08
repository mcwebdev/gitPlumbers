import { Component, inject, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { SiteHeaderComponent } from './shared/components/site-header/site-header.component';
import { SiteFooterComponent } from './shared/components/site-footer/site-footer.component';
import { ScrollService } from './shared/services/scroll.service';
import { DOCUMENT } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private scrollService = inject(ScrollService);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private routerSubscription?: Subscription;
  private currentRouteClass = '';

  ngOnInit(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateBodyClass(event.urlAfterRedirects);
      });

    // Set initial class
    this.updateBodyClass(this.router.url);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    // Clean up the class when component is destroyed
    if (this.currentRouteClass) {
      this.renderer.removeClass(this.document.body, this.currentRouteClass);
    }
  }

  private updateBodyClass(url: string): void {
    // Remove previous route class
    if (this.currentRouteClass) {
      this.renderer.removeClass(this.document.body, this.currentRouteClass);
    }

    // Generate new route class from URL
    // Remove query params and fragments
    let route = url.split('?')[0].split('#')[0];

    // Remove leading slash and replace slashes with dashes
    route = route.replace(/^\//, '').replace(/\//g, '-');

    // Handle root route
    if (!route) {
      route = 'home';
    }

    // Create valid CSS class name
    const routeClass = `route-${route}`;

    // Add new route class
    this.renderer.addClass(this.document.body, routeClass);
    this.currentRouteClass = routeClass;
  }
}
