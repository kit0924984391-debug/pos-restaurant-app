/**
 * API and Interface Design - Standard API Contracts
 * 
 * Provides unified contract envelopes for client-server communication,
 * standard pagination parameters, and machine-readable error contracts.
 */

export interface ApiContractError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponseContract<T> =
  | {
      success: true;
      data: T;
      timestamp: string;
    }
  | {
      success: false;
      error: ApiContractError;
      timestamp: string;
    };

export interface PaginationParamsContract {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMetadataContract {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResultContract<T> {
  items: T[];
  pagination: PaginationMetadataContract;
}
