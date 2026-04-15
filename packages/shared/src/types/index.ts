export * from './user';
export * from './org';
export * from './workout';
export * from './program';
export * from './exercise';
export * from './logging';
export * from './messaging';
export * from './metrics';
export * from './notification';
export * from './media';

// Common API response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    cursor?: string;
    hasMore?: boolean;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
