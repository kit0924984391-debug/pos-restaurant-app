import { z } from 'zod';

/**
 * TanStack Router-style Route Contract and Search Param Schemas
 * Type-Safe Route Registry for the entire POS application.
 */

// Search param schemas
export const boardSearchSchema = z.object({
  category: z.string().default('all'),
  sort: z.enum(['recent', 'top']).default('top'),
  page: z.coerce.number().int().positive().default(1),
  q: z.string().optional(),
});
export type BoardSearchParams = z.infer<typeof boardSearchSchema>;

export const resetPasswordSearchSchema = z.object({
  token: z.string().default(''),
});
export type ResetPasswordSearchParams = z.infer<typeof resetPasswordSearchSchema>;

export const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});
export type LoginSearchParams = z.infer<typeof loginSearchSchema>;

export const reportsSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  period: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'custom']).default('today'),
});
export type ReportsSearchParams = z.infer<typeof reportsSearchSchema>;

/**
 * Route Tree Definition with Typed Path Patterns
 */
export const ROUTES = {
  // Public & Marketing
  HOME: '/',
  LANDING: '/landing',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Store Hub
  STORE_DASHBOARD: '/store/dashboard',
  STORE_BILLING: '/store/billing',

  // Platform Admin
  PLATFORM_ADMIN: '/platform-admin',
  PLATFORM_STORES: '/platform-admin/stores',
  PLATFORM_PLANS: '/platform-admin/plans',
  PLATFORM_SUBSCRIPTIONS: '/platform-admin/subscriptions',
  PLATFORM_SETTINGS: '/platform-admin/settings',

  // Community Board
  BOARD: '/board',
  BOARD_NEW: '/board/new',
  BOARD_THREAD: '/board/thread/[id]',

  // Tenant POS & Store Management
  TENANT_POS: '/r/[slug]/pos',
  TENANT_KITCHEN: '/r/[slug]/kitchen',
  TENANT_MENU: '/r/[slug]/admin/menu',
  TENANT_INVENTORY: '/r/[slug]/admin/inventory',
  TENANT_TABLES: '/r/[slug]/admin/tables',
  TENANT_PROMOTIONS: '/r/[slug]/admin/promotions',
  TENANT_REPORTS: '/r/[slug]/admin/reports',
  TENANT_SETTINGS: '/r/[slug]/admin/settings',
  TENANT_QR_CODES: '/r/[slug]/admin/qr-codes',
  TENANT_RECEIPT: '/r/[slug]/receipt/[id]',
  TENANT_CUSTOMER_TABLE: '/r/[slug]/table/[id]',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];

/**
 * Param types required per route pattern
 */
export type RouteParams<T extends RoutePath> =
  T extends '/board/thread/[id]'
    ? { id: string }
    : T extends '/r/[slug]/receipt/[id]' | '/r/[slug]/table/[id]'
    ? { slug: string; id: string }
    : T extends `/r/[slug]/${string}`
    ? { slug: string }
    : Record<string, never>;

/**
 * Type-Safe Route Path Builder
 * Formats routes with exact parameter replacements and optional query parameters.
 */
export function buildRoutePath<T extends RoutePath>(
  route: T,
  ...args: RouteParams<T> extends Record<string, never>
    ? [params?: undefined, search?: Record<string, any>]
    : [params: RouteParams<T>, search?: Record<string, any>]
): string {
  const [params, search] = args;
  let path: string = route;

  if (params && typeof params === 'object') {
    for (const [key, val] of Object.entries(params)) {
      path = path.replace(`[${key}]`, encodeURIComponent(String(val)));
    }
  }

  if (search && typeof search === 'object') {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(search)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  return path;
}
