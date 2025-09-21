export interface PaginationState {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface PaginationConfig {
  readonly pageSize: number;
  readonly maxVisiblePages?: number;
  readonly showFirstLast?: boolean;
  readonly showPrevNext?: boolean;
}

export interface PaginationResult<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationState;
}

export interface PaginationControls {
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly canGoToFirst: boolean;
  readonly canGoToLast: boolean;
  readonly visiblePages: readonly number[];
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  pageSize: 10,
  maxVisiblePages: 5,
  showFirstLast: true,
  showPrevNext: true,
} as const;

export const BLOG_PAGINATION_CONFIG: PaginationConfig = {
  pageSize: 12,
  maxVisiblePages: 7,
  showFirstLast: true,
  showPrevNext: true,
} as const;
