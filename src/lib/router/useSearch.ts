'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { z } from 'zod';

/**
 * useSearch Hook (TanStack Router pattern for Next.js App Router)
 * Validates search params against a Zod schema and provides type-safe updates.
 *
 * @example
 * const { search, setSearch } = useSearch(boardSearchSchema);
 * console.log(search.category, search.page);
 * setSearch({ page: 2 });
 */
export function useSearch<T extends z.ZodTypeAny>(schema: T): {
  search: z.infer<T>;
  setSearch: (
    updater:
      | Partial<z.infer<T>>
      | ((prev: z.infer<T>) => Partial<z.infer<T>>),
    options?: { replace?: boolean; scroll?: boolean }
  ) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse and validate current URL search params
  const search: z.infer<T> = useMemo(() => {
    const rawObj: Record<string, any> = {};
    if (searchParams) {
      searchParams.forEach((val, key) => {
        rawObj[key] = val;
      });
    }

    const parseResult = schema.safeParse(rawObj);
    if (parseResult.success) {
      return parseResult.data;
    }

    // Fallback: parse empty object to get schema defaults
    const defaultParse = schema.safeParse({});
    return (defaultParse.success ? defaultParse.data : rawObj) as z.infer<T>;
  }, [searchParams, schema]);

  // Update search params in URL without losing existing state
  const setSearch = useCallback(
    (
      updater:
        | Partial<z.infer<T>>
        | ((prev: z.infer<T>) => Partial<z.infer<T>>),
      options: { replace?: boolean; scroll?: boolean } = { replace: true, scroll: false }
    ) => {
      const currentRaw: Record<string, string> = {};
      if (searchParams) {
        searchParams.forEach((val, key) => {
          currentRaw[key] = val;
        });
      }

      const updates = typeof updater === 'function' ? updater(search) : updater;

      const merged = { ...currentRaw };
      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined || val === null || val === '') {
          delete merged[key];
        } else {
          merged[key] = String(val);
        }
      }

      const newParams = new URLSearchParams(merged);
      const queryString = newParams.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (options.replace) {
        router.replace(targetUrl, { scroll: options.scroll });
      } else {
        router.push(targetUrl, { scroll: options.scroll });
      }
    },
    [search, searchParams, pathname, router]
  );

  return { search, setSearch };
}
