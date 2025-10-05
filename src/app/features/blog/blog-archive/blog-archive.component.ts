import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BlogStore } from '../blog.store';
import { BlogContentService } from '../blog-content.service';
import { BlogCategory } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonModule } from 'primeng/skeleton';

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
  imports: [CommonModule, RouterLink, DatePipe, LoadingSpinnerComponent, PaginationComponent, SkeletonModule],
  templateUrl: './blog-archive.component.html',
  styleUrl: './blog-archive.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogArchiveComponent implements OnInit, OnDestroy {
  protected readonly _blogStore = inject(BlogStore);
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);

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

  protected readonly hasActiveSearch = computed(() => this._blogStore.searchTerm().trim().length > 0);

  protected readonly isLoading = computed(() => this._blogStore.loading());
  protected readonly hasError = computed(() => !!this._blogStore.error());
  
  // Skeleton loading state - show 12 skeleton items when loading
  protected readonly skeletonItems = computed(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      items.push({ id: i });
    }
    return items;
  });

  protected readonly totalVisiblePosts = computed(() => this._blogStore.filteredPosts().length);

  // Pagination computed properties
  protected readonly paginationState = computed(() => this._blogStore.paginationState());
  protected readonly paginationControls = computed(() => this._blogStore.paginationControls());
  protected readonly paginatedPosts = computed(() => this._blogStore.paginatedPosts());

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
      url: 'https://gitplumbers.com/blog/articles/',
    });

    this._seo.updateMetadata(metadata);
    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'GitPlumbers Insights Archive',
      description:
        'Complete archive of GitPlumbers case studies, playbooks, and engineering field notes.',
      url: 'https://gitplumbers.com/blog/articles/',
      numberOfItems: posts.length,
    });
  });

  // Load posts on client-side after SSR
  ngOnInit(): void {
    // Only load posts on client-side
    if (typeof window !== 'undefined' && this._blogStore.posts().length === 0) {
      this._blogStore.loadPosts();
    }

    // Initialize pagination from URL query parameters
    this._initializeFromQueryParams();
  }

  protected onCategoryChange(value: string): void {
    const next = this.categoryOptions.some((option) => option.slug === value) ? value : 'all';
    this._blogStore.setSelectedCategory(next);
    this._updateUrlQueryParams({ category: next === 'all' ? '' : next, page: '1' });
  }

  protected onSortChange(value: string): void {
    const next = this.sortOptions.some((option) => option.id === value)
      ? (value as SortOptionId)
      : 'newest';
    this._blogStore.setSortOption(next);
    this._updateUrlQueryParams({ sort: next === 'newest' ? '' : next, page: '1' });
  }

  protected onSearchChange(value: string): void {
    this._blogStore.setSearchTerm(value);
    this._updateUrlQueryParams({ search: value.trim() || '', page: '1' });
  }

  protected clearSearch(): void {
    if (this.hasActiveSearch()) {
      this._blogStore.clearSearch();
      this._updateUrlQueryParams({ search: '', page: '1' });
    }
  }

  protected refreshPage(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  // Pagination event handlers
  protected onPageChange(page: number): void {
    this._blogStore.setCurrentPage(page);
    this._updateUrlQueryParams({ page: page.toString() });
  }

  protected onFirstPage(): void {
    this._blogStore.goToFirstPage();
    this._updateUrlQueryParams({ page: '1' });
  }

  protected onPreviousPage(): void {
    this._blogStore.goToPreviousPage();
    const currentPage = this._blogStore.paginationState().currentPage;
    this._updateUrlQueryParams({ page: currentPage.toString() });
  }

  protected onNextPage(): void {
    this._blogStore.goToNextPage();
    const currentPage = this._blogStore.paginationState().currentPage;
    this._updateUrlQueryParams({ page: currentPage.toString() });
  }

  protected onLastPage(): void {
    this._blogStore.goToLastPage();
    const currentPage = this._blogStore.paginationState().currentPage;
    this._updateUrlQueryParams({ page: currentPage.toString() });
  }


  private _initializeFromQueryParams(): void {
    const queryParams = this._route.snapshot.queryParams;
    
    // Initialize page from URL
    if (queryParams['page']) {
      const page = parseInt(queryParams['page'], 10);
      if (!isNaN(page) && page > 0) {
        this._blogStore.setCurrentPage(page);
      }
    }

    // Initialize filters from URL
    if (queryParams['category']) {
      this._blogStore.setSelectedCategory(queryParams['category']);
    }

    if (queryParams['sort']) {
      this._blogStore.setSortOption(queryParams['sort'] as SortOptionId);
    }

    if (queryParams['search']) {
      this._blogStore.setSearchTerm(queryParams['search']);
    }
  }

  private _updateUrlQueryParams(params: Record<string, string>): void {
    const currentParams = this._route.snapshot.queryParams;
    const newParams = { ...currentParams, ...params };

    // Remove empty values
    Object.keys(newParams).forEach(key => {
      if (!newParams[key] || newParams[key] === '') {
        delete newParams[key];
      }
    });

    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: newParams,
      queryParamsHandling: 'merge',
    });
  }

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}

