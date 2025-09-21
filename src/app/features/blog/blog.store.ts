import { signalStore, withProps, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { pipe, map, catchError, of, switchMap } from 'rxjs';
import { BlogPost, BlogCategory } from './blog-content';
import { PaginationState, PaginationResult, PaginationControls, BLOG_PAGINATION_CONFIG } from '../../shared/models/pagination.model';

interface BlogState {
  posts: BlogPost[];
  featuredPosts: BlogPost[];
  recentPosts: BlogPost[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
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
  }),
  withComputed((store) => ({
    hasPosts: () => store.posts().length > 0,
    hasFeaturedPosts: () => store.featuredPosts().length > 0,
    hasRecentPosts: () => store.recentPosts().length > 0,
    paginationState: computed((): PaginationState => {
      const totalItems = store.posts().length;
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
      const posts = store.posts();
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
      const totalItems = store.posts().length;
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
  })),
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

          const toMillis = (value: unknown): number | null => {
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

          const posts = snapshot.docs.map((doc) => {
            const raw = doc.data() as BlogPost & {
              createdAt?: unknown;
              updatedAt?: unknown;
              publishedOnMs?: number;
              createdAtMs?: number;
              updatedAtMs?: number;
            };

            const publishedOnMs = raw.publishedOnMs ?? toMillis(raw.publishedOn);
            const createdAtMs = raw.createdAtMs ?? toMillis(raw.createdAt);
            const updatedAtMs = raw.updatedAtMs ?? toMillis(raw.updatedAt);
            const docCreatedMs = toMillis((doc as unknown as { createTime?: unknown }).createTime);
            const docUpdatedMs = toMillis((doc as unknown as { updateTime?: unknown }).updateTime);

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
          console.error('BlogStore loadPosts error:', error);
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
      const totalItems = store.posts().length;
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
      const totalItems = store.posts().length;
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
      const totalItems = store.posts().length;
      const pageSize = store.pageSize();
      const totalPages = Math.ceil(totalItems / pageSize);
      patchState(store, { currentPage: Math.max(1, totalPages) });
    },
  })),
  withHooks({
    onInit(store) {
      store.loadPosts();
    },
  })
);
