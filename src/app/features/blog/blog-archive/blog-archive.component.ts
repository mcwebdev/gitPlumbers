import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogStore } from '../blog.store';
import { BlogContentService } from '../blog-content.service';
import { BlogCategory, BlogPost } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type SortOptionId = 'newest' | 'oldest' | 'title';

interface SortOption {
  readonly id: SortOptionId;
  readonly label: string;
}

interface CategoryOption {
  readonly slug: string;
  readonly label: string;
}

@Component({
  selector: 'app-blog-archive',
  standalone: true,
  imports: [CommonModule, RouterLink, NgFor, DatePipe, LoadingSpinnerComponent],
  templateUrl: './blog-archive.component.html',
  styleUrl: './blog-archive.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogArchiveComponent implements OnInit, OnDestroy {
  private readonly _blogStore = inject(BlogStore);
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);
  private readonly _titleCollator = new Intl.Collator('en', { sensitivity: 'base' });

  protected readonly categories: ReadonlyArray<BlogCategory> = this._content.categories;

  protected readonly categoryOptions: ReadonlyArray<CategoryOption> = [
    { slug: 'all', label: 'All topics' },
    ...this.categories.map((category) => ({
      slug: category.slug,
      label: category.title,
    })),
  ];

  protected readonly sortOptions: ReadonlyArray<SortOption> = [
    { id: 'newest', label: 'Newest first' },
    { id: 'oldest', label: 'Oldest first' },
    { id: 'title', label: 'Title A-Z' },
  ];

  protected readonly selectedCategory = signal<string>('all');
  protected readonly sortOption = signal<SortOptionId>('newest');
  protected readonly searchTerm = signal<string>('');
  protected readonly hasActiveSearch = computed(() => this.searchTerm().trim().length > 0);

  protected readonly isLoading = computed(() => this._blogStore.loading());
  protected readonly hasError = computed(() => !!this._blogStore.error());

  protected readonly totalVisiblePosts = computed(() => this.filteredPosts().length);

  protected readonly filteredPosts = computed<ReadonlyArray<BlogPost>>(() => {
    const posts = this._blogStore.posts();
    const category = this.selectedCategory();
    const sort = this.sortOption();
    const query = this.searchTerm().trim().toLowerCase();

    if (!posts || posts.length === 0) {
      return [];
    }

    let filtered = category === 'all' ? [...posts] : posts.filter((post) => post.categorySlug === category);

    if (query) {
      filtered = filtered.filter((post) => this._matchesQuery(post, query));
    }

    const decorated = filtered.map((post) => ({ post, sortKey: this._getSortKey(post) }));

    return decorated
      .sort((a, b) => this._sortComparator(a.post, b.post, sort, a.sortKey, b.sortKey))
      .map(({ post }) => post);
  });

  private readonly _seoEffect = effect(() => {
    const posts = this._blogStore.posts();

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: 'All GitPlumbers Articles | Modernisation Playbooks & Field Notes',
      description:
        'Browse every GitPlumbers insight, filter by topic, sort by publish date, and search to find the modernisation guidance your team needs.',
      keywords: [
        'software modernisation articles',
        'engineering blog archive',
        'tech debt remediation tips',
        'AI code stabilisation insights',
        'modernisation blog search',
      ],
      url: 'https://gitplumbers.com/blog/articles',
    });

    this._seo.updateMetadata(metadata);
    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'GitPlumbers Insights Archive',
      description:
        'Complete archive of GitPlumbers case studies, playbooks, and engineering field notes.',
      url: 'https://gitplumbers.com/blog/articles',
      numberOfItems: posts.length,
    });
  });

  // Load posts on client-side after SSR
  ngOnInit(): void {
    // Only load posts on client-side
    if (typeof window !== 'undefined' && this._blogStore.posts().length === 0) {
      this._blogStore.loadPosts();
    }
  }

  protected onCategoryChange(value: string): void {
    const next = this.categoryOptions.some((option) => option.slug === value) ? value : 'all';
    this.selectedCategory.set(next);
  }

  protected onSortChange(value: string): void {
    const next = this.sortOptions.some((option) => option.id === value)
      ? (value as SortOptionId)
      : 'newest';
    this.sortOption.set(next);
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected clearSearch(): void {
    if (this.hasActiveSearch()) {
      this.searchTerm.set('');
    }
  }

  protected refreshPage(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  private _matchesQuery(post: BlogPost, query: string): boolean {
    const keywordText = Array.isArray(post.keywords) ? post.keywords.join(' ') : '';

    return [
      post.title,
      post.summary,
      post.deck,
      post.categorySlug,
      keywordText,
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .some((value) => value.toLowerCase().includes(query));
  }

  private _sortComparator(
    a: BlogPost,
    b: BlogPost,
    option: SortOptionId,
    aKey: number,
    bKey: number
  ): number {
    if (option === 'title') {
      return this._titleCollator.compare(a.title, b.title);
    }

    if (option === 'newest') {
      return bKey - aKey;
    }

    return aKey - bKey;
  }

  private _getSortKey(post: BlogPost): number {
    const enriched = post as BlogPost & {
      slug?: string;
      publishedOnMs?: number;
      createdAtMs?: number;
      updatedAtMs?: number;
      createdAt?: string | Date;
      updatedAt?: string | Date;
    };

    const publishedMs = enriched.publishedOnMs ?? this._coerceToMillis(enriched.publishedOn);
    const createdMs = enriched.createdAtMs ?? this._coerceToMillis(enriched.createdAt);
    const updatedMs = enriched.updatedAtMs ?? this._coerceToMillis(enriched.updatedAt);

    const tieSource =
      createdMs ??
      updatedMs ??
      this._stableHash((enriched.slug ?? enriched.title ?? '').toLowerCase());

    if (typeof publishedMs === 'number') {
      const tieOffset = typeof tieSource === 'number' ? (tieSource % 1_000) / 1_000 : 0;
      return publishedMs + tieOffset;
    }

    if (typeof createdMs === 'number') {
      return createdMs;
    }

    if (typeof updatedMs === 'number') {
      return updatedMs;
    }

    return typeof tieSource === 'number' ? tieSource : 0;
  }

  private _coerceToMillis(value: unknown): number | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'number') {
      if (value > 1_000_000_000_000) {
        return value;
      }

      if (value > 1_000_000_000) {
        return value * 1_000;
      }

      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof value === 'object') {
      const candidate = value as {
        toDate?: () => Date;
        toMillis?: () => number;
        seconds?: number;
        nanoseconds?: number;
      };

      if (typeof candidate.toMillis === 'function') {
        return candidate.toMillis();
      }

      if (typeof candidate.toDate === 'function') {
        const result = candidate.toDate();
        return result instanceof Date ? result.getTime() : null;
      }

      if (typeof candidate.seconds === 'number') {
        const base = candidate.seconds * 1_000;
        if (typeof candidate.nanoseconds === 'number') {
          return base + Math.floor(candidate.nanoseconds / 1_000_000);
        }

        return base;
      }
    }

    return null;
  }

  private _stableHash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash);
  }

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}
