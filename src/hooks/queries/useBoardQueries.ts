import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys Factory Pattern according to TanStack Query v5 best practices
export const boardKeys = {
  all: ['board'] as const,
  categories: () => [...boardKeys.all, 'categories'] as const,
  threads: (params: { category: string; sort: string; page: number; search?: string }) =>
    [...boardKeys.all, 'threads', params] as const,
  thread: (id: string) => [...boardKeys.all, 'thread', id] as const,
};

export function useBoardCategories() {
  return useQuery({
    queryKey: boardKeys.categories(),
    queryFn: async () => {
      const res = await fetch('/api/board/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      return (data.categories as any[]) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });
}

export function useBoardThreads(params: {
  category: string;
  sort: string;
  page: number;
  search?: string;
}) {
  return useQuery({
    queryKey: boardKeys.threads(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        category: params.category,
        sort: params.sort,
        page: params.page.toString(),
        limit: '15',
      });
      if (params.search?.trim()) {
        queryParams.set('q', params.search.trim());
      }

      const res = await fetch(`/api/board/threads?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch threads');
      const data = await res.json();
      return {
        threads: (data.threads as any[]) || [],
        totalPages: (data.pagination?.totalPages as number) || 1,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpvoteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const res = await fetch('/api/board/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, type: 'UPVOTE' }),
      });
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      if (!res.ok) {
        throw new Error('Failed to upvote');
      }
      return res.json();
    },
    onSuccess: (_, threadId) => {
      // Invalidate both the thread list and specific thread query
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
