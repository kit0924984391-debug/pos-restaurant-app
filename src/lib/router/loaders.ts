import { QueryClient } from '@tanstack/react-query';
import { boardKeys } from '@/hooks/queries/useBoardQueries';
import { ROUTES, RoutePath } from './routes';

/**
 * TanStack Router-style Route Loaders
 * Coordinated with TanStack Query (QueryClient) for instant data prefetching
 */
export const routeLoaders = {
  /**
   * Prefetches data for the Community Board page (/board)
   */
  async prefetchBoard(
    queryClient: QueryClient,
    options?: { category?: string; sort?: 'recent' | 'top'; page?: number }
  ) {
    const category = options?.category || 'all';
    const sort = options?.sort || 'top';
    const page = options?.page || 1;

    // Prefetch categories and threads in parallel
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: boardKeys.categories(),
        queryFn: async () => {
          const res = await fetch('/api/board/categories');
          return res.json();
        },
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: boardKeys.threads({ category, sort, page }),
        queryFn: async () => {
          const params = new URLSearchParams({ category, sort, page: String(page), limit: '15' });
          const res = await fetch(`/api/board/threads?${params.toString()}`);
          return res.json();
        },
        staleTime: 1000 * 60 * 2,
      }),
    ]);
  },

  /**
   * Prefetches data for a specific Thread Detail page (/board/thread/[id])
   */
  async prefetchThreadDetail(queryClient: QueryClient, threadId: string) {
    if (!threadId) return;
    await queryClient.prefetchQuery({
      queryKey: boardKeys.thread(threadId),
      queryFn: async () => {
        const res = await fetch(`/api/board/threads/${threadId}`);
        return res.json();
      },
      staleTime: 1000 * 60 * 2,
    });
  },

  /**
   * Prefetches Store Settings and Menus for Tenant Routes (/r/[slug]/...)
   */
  async prefetchTenantSettings(queryClient: QueryClient, slug: string) {
    if (!slug) return;
    await queryClient.prefetchQuery({
      queryKey: ['tenant', slug, 'settings'],
      queryFn: async () => {
        const res = await fetch(`/api/r/${slug}/settings`);
        return res.json();
      },
      staleTime: 1000 * 60 * 10,
    });
  },
};
