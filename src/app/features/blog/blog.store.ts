import { signalStore, withProps, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { pipe, map, catchError, of, switchMap } from 'rxjs';
import { BlogPost, BlogCategory } from './blog-content';
import { PaginationState, PaginationResult, PaginationControls, BLOG_PAGINATION_CONFIG } from '../../shared/models/pagination.model';

// Helper functions
const matchesQuery = (post: BlogPost, query: string): boolean => {
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
};

const coerceToMillis = (value: unknown): number | null => {
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
};

const stableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const getSortKey = (post: BlogPost): number => {
  const enriched = post as BlogPost & {
    slug?: string;
    publishedOnMs?: number;
    createdAtMs?: number;
    updatedAtMs?: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };

  const publishedMs = enriched.publishedOnMs ?? coerceToMillis(enriched.publishedOn);
  const createdMs = enriched.createdAtMs ?? coerceToMillis(enriched.createdAt);
  const updatedMs = enriched.updatedAtMs ?? coerceToMillis(enriched.updatedAt);

  const tieSource =
    createdMs ??
    updatedMs ??
    stableHash((enriched.slug ?? enriched.title ?? '').toLowerCase());

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
};

const sortComparator = (
  a: BlogPost,
  b: BlogPost,
  option: 'newest' | 'oldest' | 'title',
  aKey: number,
  bKey: number
): number => {
  const titleCollator = new Intl.Collator('en', { sensitivity: 'base' });
  
  if (option === 'title') {
    return titleCollator.compare(a.title, b.title);
  }

  if (option === 'newest') {
    return bKey - aKey;
  }

  return aKey - bKey;
};

interface BlogState {
  posts: BlogPost[];
  featuredPosts: BlogPost[];
  recentPosts: BlogPost[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  selectedCategory: string;
  sortOption: 'newest' | 'oldest' | 'title';
}

export const BlogStore = signalStore(
  { providedIn: 'root' },
  withProps(() => ({
    _firestore: inject(Firestore),
  })),
  withState<BlogState>({
    posts: [],
    featuredPosts: [],
    recentPosts: [],
    loading: false,
    error: null,
    currentPage: 1,
    pageSize: BLOG_PAGINATION_CONFIG.pageSize,
    searchTerm: '',
    selectedCategory: 'all',
    sortOption: 'newest',
  }),
  withComputed((store) => {
    const filteredPosts = computed((): BlogPost[] => {
      const posts = store.posts();
      const category = store.selectedCategory();
      const sort = store.sortOption();
      const query = store.searchTerm().trim().toLowerCase();

      if (!posts || posts.length === 0) {
        return [];
      }

      let filtered = category === 'all' ? [...posts] : posts.filter((post) => post.categorySlug === category);

      if (query) {
        filtered = filtered.filter((post) => matchesQuery(post, query));
      }

      const decorated = filtered.map((post) => ({ post, sortKey: getSortKey(post) }));

      return decorated
        .sort((a, b) => sortComparator(a.post, b.post, sort, a.sortKey, b.sortKey))
        .map(({ post }) => post);
    });

    return {
      hasPosts: () => store.posts().length > 0,
      hasFeaturedPosts: () => store.featuredPosts().length > 0,
      hasRecentPosts: () => store.recentPosts().length > 0,
      filteredPosts,
      paginationState: computed((): PaginationState => {
        const totalItems = filteredPosts().length;
        const pageSize = store.pageSize();
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentPage = Math.min(store.currentPage(), Math.max(1, totalPages));
        
        return {
          currentPage,
          pageSize,
          totalItems,
          totalPages: Math.max(1, totalPages),
        };
      }),
      paginatedPosts: computed((): PaginationResult<BlogPost> => {
        const posts = filteredPosts();
        const totalItems = posts.length;
        const pageSize = store.pageSize();
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentPage = Math.min(store.currentPage(), Math.max(1, totalPages));
        
        const pagination: PaginationState = {
          currentPage,
          pageSize,
          totalItems,
          totalPages: Math.max(1, totalPages),
        };
        
        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const items = posts.slice(startIndex, endIndex);
        
        return {
          items,
          pagination,
        };
      }),
      paginationControls: computed((): PaginationControls => {
        const totalItems = filteredPosts().length;
        const pageSize = store.pageSize();
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentPage = Math.min(store.currentPage(), Math.max(1, totalPages));
        const maxVisible = BLOG_PAGINATION_CONFIG.maxVisiblePages || 5;
        
        const hasPrevious = currentPage > 1;
        const hasNext = currentPage < totalPages;
        const canGoToFirst = currentPage > 1;
        const canGoToLast = currentPage < totalPages;
        
        // Calculate visible page numbers
        const visiblePages: number[] = [];
        const halfVisible = Math.floor(maxVisible / 2);
        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage + 1 < maxVisible) {
          startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
          visiblePages.push(i);
        }
        
        return {
          hasPrevious,
          hasNext,
          canGoToFirst,
          canGoToLast,
          visiblePages,
        };
      }),
    };
  }),
  withMethods((store) => ({
    loadPosts: rxMethod<void>(
      pipe(
        map(() => {
          patchState(store, { loading: true, error: null });
        }),
        switchMap(() =>
          getDocs(
            query(
              collection(store._firestore, 'blog_posts'),
              where('status', '==', 'published')
            )
          )
        ),
        map((snapshot) => {
          const posts = snapshot.docs.map((doc) => {
            const raw = doc.data() as BlogPost & {
              createdAt?: unknown;
              updatedAt?: unknown;
              publishedOnMs?: number;
              createdAtMs?: number;
              updatedAtMs?: number;
            };

            const publishedOnMs = raw.publishedOnMs ?? coerceToMillis(raw.publishedOn);
            const createdAtMs = raw.createdAtMs ?? coerceToMillis(raw.createdAt);
            const updatedAtMs = raw.updatedAtMs ?? coerceToMillis(raw.updatedAt);
            const docCreatedMs = coerceToMillis((doc as unknown as { createTime?: unknown }).createTime);
            const docUpdatedMs = coerceToMillis((doc as unknown as { updateTime?: unknown }).updateTime);

            const normalisedCreatedMs = createdAtMs ?? docCreatedMs ?? updatedAtMs ?? docUpdatedMs ?? publishedOnMs ?? Date.now();
            const normalisedUpdatedMs = updatedAtMs ?? docUpdatedMs ?? normalisedCreatedMs;
            const normalisedPublishedOnMs = publishedOnMs ?? normalisedCreatedMs;

            const normalisedPublishedOn =
              typeof raw.publishedOn === 'string' && raw.publishedOn.length > 0
                ? raw.publishedOn
                : new Date(normalisedPublishedOnMs).toISOString().slice(0, 10);

            return {
              ...raw,
              publishedOn: normalisedPublishedOn,
              createdAt: raw.createdAt ?? new Date(normalisedCreatedMs).toISOString(),
              updatedAt: raw.updatedAt ?? new Date(normalisedUpdatedMs).toISOString(),
              publishedOnMs: normalisedPublishedOnMs,
              createdAtMs: normalisedCreatedMs,
              updatedAtMs: normalisedUpdatedMs,
            };
          });

          const sortedPosts = posts.sort((a, b) => {
            const publishedDiff = (b.publishedOnMs ?? 0) - (a.publishedOnMs ?? 0);
            if (publishedDiff !== 0) {
              return publishedDiff;
            }

            return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
          });

          patchState(store, {
            posts: sortedPosts,
            featuredPosts: sortedPosts.slice(0, 3),
            recentPosts: sortedPosts.slice(0, 5),
            loading: false,
            error: null,
          });
        }),
        catchError((error) => {
          patchState(store, {
            loading: false,
            error: error.message || 'Failed to load blog posts',
            posts: [],
            featuredPosts: [],
            recentPosts: [],
          });
          return of(null);
        })
      )
    ),
    getPostBySlug: (slug: string) => {
      return store.posts().find(post => post.slug === slug);
    },
    getPostsByCategory: (categorySlug: string) => {
      return store.posts().filter(post => post.categorySlug === categorySlug);
    },
    getRelatedPosts: (currentSlug: string, categorySlug: string) => {
      return store.posts()
        .filter(post => post.slug !== currentSlug && post.categorySlug === categorySlug)
        .slice(0, 2);
    },
    setCurrentPage: (page: number) => {
      const totalItems = store.paginationState().totalItems;
      const pageSize = store.pageSize();
      const totalPages = Math.ceil(totalItems / pageSize);
      const validPage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
      patchState(store, { currentPage: validPage });
    },
    setPageSize: (size: number) => {
      const validSize = Math.max(1, size);
      patchState(store, { pageSize: validSize, currentPage: 1 });
    },
    goToNextPage: () => {
      const totalItems = store.paginationState().totalItems;
      const pageSize = store.pageSize();
      const totalPages = Math.ceil(totalItems / pageSize);
      const currentPage = store.currentPage();
      if (currentPage < totalPages) {
        patchState(store, { currentPage: currentPage + 1 });
      }
    },
    goToPreviousPage: () => {
      const currentPage = store.currentPage();
      if (currentPage > 1) {
        patchState(store, { currentPage: currentPage - 1 });
      }
    },
    goToFirstPage: () => {
      patchState(store, { currentPage: 1 });
    },
    goToLastPage: () => {
      const totalItems = store.paginationState().totalItems;
      const pageSize = store.pageSize();
      const totalPages = Math.ceil(totalItems / pageSize);
      patchState(store, { currentPage: Math.max(1, totalPages) });
    },
    setSearchTerm: (term: string) => {
      patchState(store, { searchTerm: term, currentPage: 1 });
    },
    setSelectedCategory: (category: string) => {
      patchState(store, { selectedCategory: category, currentPage: 1 });
    },
    setSortOption: (option: 'newest' | 'oldest' | 'title') => {
      patchState(store, { sortOption: option, currentPage: 1 });
    },
    clearSearch: () => {
      patchState(store, { searchTerm: '', currentPage: 1 });
    },
  })),
  withHooks({
    onInit(store) {
      store.loadPosts();
    },
  })
);
