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
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reading-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reading-progress.component.html',
  styleUrl: './reading-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingProgressComponent implements OnInit, OnDestroy {
  @ViewChild('progressBar', { static: true }) progressBar!: ElementRef<HTMLDivElement>;

  private readonly _elementRef = inject(ElementRef);

  private readonly _scrollProgress = signal(0);
  private readonly _isVisible = signal(false);

  readonly progress = computed(() => this._scrollProgress());
  readonly isVisible = computed(() => this._isVisible());

  private _scrollListener?: () => void;

  ngOnInit(): void {
    this._scrollListener = this.updateProgress.bind(this);
    window.addEventListener('scroll', this._scrollListener, { passive: true });
    this.updateProgress();
  }

  ngOnDestroy(): void {
    if (this._scrollListener) {
      window.removeEventListener('scroll', this._scrollListener);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateProgress();
  }

  private updateProgress(): void {
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

    // Show progress bar when article is in view
    const shouldShow = scrollTop > articleTop - windowHeight * 0.5;
    this._isVisible.set(shouldShow);

    if (!shouldShow) return;

    // Calculate progress based on how much of the article has been scrolled past
    const articleBottom = articleTop + articleHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;

    // Progress is based on how much of the article content has been "read"
    const readStart = Math.max(viewportTop, articleTop);
    const readEnd = Math.min(viewportBottom, articleBottom);
    const readHeight = Math.max(0, readEnd - readStart);
    const totalReadableHeight = articleHeight;

    const progress = totalReadableHeight > 0 ? (readHeight / totalReadableHeight) * 100 : 0;
    this._scrollProgress.set(Math.min(100, Math.max(0, progress)));
  }

  private findArticleElement(): HTMLElement | null {
    // Look for the article element in the DOM
    const article = document.querySelector('article.blog-post') as HTMLElement;
    if (article) return article;

    // Fallback: look for any article element
    return document.querySelector('article') as HTMLElement;
  }
}
