import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  buildRoutePath,
  boardSearchSchema,
  resetPasswordSearchSchema,
  loginSearchSchema,
  reportsSearchSchema,
} from '@/lib/router/routes';

describe('TanStack Router Architecture & Type-Safe Routing Suite', () => {
  describe('1. buildRoutePath Type-Safe URL Builder', () => {
    it('builds static routes without parameters', () => {
      expect(buildRoutePath(ROUTES.BOARD)).toBe('/board');
      expect(buildRoutePath(ROUTES.LOGIN)).toBe('/login');
      expect(buildRoutePath(ROUTES.STORE_DASHBOARD)).toBe('/store/dashboard');
    });

    it('builds static routes with search query parameters', () => {
      const url = buildRoutePath(ROUTES.BOARD, undefined, { category: 'feature', sort: 'top' });
      expect(url).toBe('/board?category=feature&sort=top');
    });

    it('replaces single dynamic segment correctly', () => {
      const url = buildRoutePath(ROUTES.TENANT_POS, { slug: 'lung-pa' });
      expect(url).toBe('/r/lung-pa/pos');

      const kitchenUrl = buildRoutePath(ROUTES.TENANT_KITCHEN, { slug: 'lung-pa' });
      expect(kitchenUrl).toBe('/r/lung-pa/kitchen');
    });

    it('replaces multiple dynamic segments correctly', () => {
      const receiptUrl = buildRoutePath(ROUTES.TENANT_RECEIPT, { slug: 'lung-pa', id: 'ord-123' });
      expect(receiptUrl).toBe('/r/lung-pa/receipt/ord-123');

      const tableUrl = buildRoutePath(ROUTES.TENANT_CUSTOMER_TABLE, { slug: 'lung-pa', id: 'tbl-5' });
      expect(tableUrl).toBe('/r/lung-pa/table/tbl-5');
    });

    it('combines dynamic segments with search query parameters', () => {
      const url = buildRoutePath(
        ROUTES.TENANT_REPORTS,
        { slug: 'lung-pa' },
        { period: 'today', from: '2026-10-15' }
      );
      expect(url).toBe('/r/lung-pa/admin/reports?period=today&from=2026-10-15');
    });
  });

  describe('2. Zod Search Schema Validation (TanStack Router pattern)', () => {
    it('boardSearchSchema applies valid defaults for empty query', () => {
      const parsed = boardSearchSchema.parse({});
      expect(parsed).toEqual({
        category: 'all',
        sort: 'top',
        page: 1,
        q: undefined,
      });
    });

    it('boardSearchSchema coerces string page numbers and validates sort', () => {
      const parsed = boardSearchSchema.parse({
        category: 'suggestion',
        sort: 'recent',
        page: '3',
        q: 'ข้าวมันไก่',
      });
      expect(parsed).toEqual({
        category: 'suggestion',
        sort: 'recent',
        page: 3,
        q: 'ข้าวมันไก่',
      });
    });

    it('resetPasswordSearchSchema parses token safely', () => {
      const parsed = resetPasswordSearchSchema.parse({ token: 'test-token-xyz' });
      expect(parsed.token).toBe('test-token-xyz');

      const empty = resetPasswordSearchSchema.parse({});
      expect(empty.token).toBe('');
    });

    it('loginSearchSchema parses redirect URL safely', () => {
      const parsed = loginSearchSchema.parse({ redirect: '/r/lung-pa/pos' });
      expect(parsed.redirect).toBe('/r/lung-pa/pos');
    });

    it('reportsSearchSchema parses date filters with defaults', () => {
      const parsed = reportsSearchSchema.parse({ period: 'this_month' });
      expect(parsed.period).toBe('this_month');
      expect(parsed.from).toBeUndefined();
    });
  });
});
