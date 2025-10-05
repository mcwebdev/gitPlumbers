import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private platformId = inject(PLATFORM_ID);

  constructor(private router: Router) {
    if (isPlatformBrowser(this.platformId)) {
      console.log('ScrollService initialized');
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          console.log('Scrolling to top');
          const appContent = document.querySelector('.app-content');
          if (appContent) {
            appContent.scrollTo({ top: 0, behavior: 'instant' });
          }
        });
    }
  }
}
