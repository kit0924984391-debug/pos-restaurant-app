'use client';

import React from 'react';
import Link, { LinkProps } from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { buildRoutePath, RoutePath, RouteParams } from './routes';
import { routeLoaders } from './loaders';

export type TypedLinkProps<T extends RoutePath> = Omit<LinkProps, 'href'> & {
  to: T;
  params?: RouteParams<T>;
  search?: Record<string, any>;
  preload?: 'intent' | false;
  children: React.ReactNode;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

/**
 * TypedLink Component
 * TanStack Router-style Type-Safe Link component for Next.js App Router.
 * Automatically verifies route params and prefetches data on hover when preload="intent".
 */
export function TypedLink<T extends RoutePath>({
  to,
  params,
  search,
  preload = false,
  children,
  onMouseEnter,
  ...props
}: TypedLinkProps<T>) {
  const queryClient = useQueryClient();

  // Safely cast params for buildRoutePath
  const href = buildRoutePath(to as any, params as any, search);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (preload === 'intent') {
      try {
        if (to === '/board') {
          routeLoaders.prefetchBoard(queryClient, search as any);
        } else if (to === '/board/thread/[id]' && params && 'id' in params) {
          routeLoaders.prefetchThreadDetail(queryClient, (params as any).id);
        } else if (params && 'slug' in params) {
          routeLoaders.prefetchTenantSettings(queryClient, (params as any).slug);
        }
      } catch (err) {
        // Prefetch failure shouldn't disrupt user
      }
    }

    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <Link href={href} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
}
