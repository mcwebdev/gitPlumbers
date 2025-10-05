import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-reading-progress',
  standalone: true,
  imports: [],
  templateUrl: './reading-progress.component.html',
  styleUrl: './reading-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingProgressComponent implements OnInit, OnDestroy {
  @ViewChild('progressBar', { static: true }) progressBar!: ElementRef<HTMLDivElement>;

  private readonly _elementRef = inject(ElementRef);
  private readonly _platformId = inject(PLATFORM_ID);

  private readonly _scrollProgress = signal(0);
  private readonly _isVisible = signal(false);

  readonly progress = computed(() => this._scrollProgress());
  readonly isVisible = computed(() => this._isVisible());

  private _scrollListener?: () => void;

  ngOnInit(): void {
    // Only run on browser platform
    if (!isPlatformBrowser(this._platformId)) return;
    
    this._scrollListener = this.updateProgress.bind(this);
    this.setupScrollListener();
    this.updateProgress();
  }

  private setupScrollListener(): void {
    if (!this._scrollListener || !isPlatformBrowser(this._platformId)) return;
    
    // Listen to window scroll
    window.addEventListener('scroll', this._scrollListener, { passive: true });
  }

  ngOnDestroy(): void {
    if (this._scrollListener && isPlatformBrowser(this._platformId)) {
      window.removeEventListener('scroll', this._scrollListener);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // Only run on browser platform
    if (!isPlatformBrowser(this._platformId)) return;
    
    // Use setTimeout to ensure DOM has updated after resize
    setTimeout(() => this.updateProgress(), 0);
  }

  private updateProgress(): void {
    // Only run on browser platform
    if (!isPlatformBrowser(this._platformId)) return;
    
    const article = this.findArticleElement();
    if (!article) {
      this._isVisible.set(false);
      return;
    }

    const articleRect = article.getBoundingClientRect();
    const articleTop = articleRect.top + window.scrollY;
    const articleHeight = articleRect.height;
    const windowHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    const footerHeight = 252; // Footer height in pixels

    // Show progress bar when article starts to come into view
    const shouldShow = scrollTop > articleTop - windowHeight;
    this._isVisible.set(shouldShow);

    if (!shouldShow) return;

    // Calculate progress based on how much of the article has been scrolled through
    // Account for footer height in the calculation
    const articleBottom = articleTop + articleHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;

    // Progress calculation: how much of the article has been scrolled past
    // Subtract footer height from total scrollable area
    const scrolledPastStart = Math.max(0, viewportTop - articleTop);
    const totalScrollableHeight = articleHeight + windowHeight - footerHeight; // Article height + viewport height - footer height
    const progress = totalScrollableHeight > 0 ? (scrolledPastStart / totalScrollableHeight) * 100 : 0;
    
    this._scrollProgress.set(Math.min(100, Math.max(0, progress)));
  }

  private findArticleElement(): HTMLElement | null {
    // Only run on browser platform
    if (!isPlatformBrowser(this._platformId)) return null;
    
    // Look for the article element in the DOM
    const article = document.querySelector('article.blog-post') as HTMLElement;
    if (article) return article;

    // Fallback: look for any article element
    return document.querySelector('article') as HTMLElement;
  }
}
