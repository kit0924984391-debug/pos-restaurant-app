import { describe, it, expect } from 'vitest';
import {
  BigQuerySQLOptimizer,
  BigQueryAnalyticsQueries,
  BigQueryAnalyticsDDL,
} from '@/lib/analytics';

describe('BigQuery SQL Optimization & Analytics Suite', () => {
  describe('BigQuerySQLOptimizer - Mandatory & Conditional Rewrites', () => {
    it('1. Mandatory Rewrite: Rewrites `WHERE (SELECT COUNT(*) FROM ...) > 0` to `WHERE EXISTS`', () => {
      const inputSql = `
        SELECT store_id, total_amount
        FROM \`pos_analytics.orders\`
        WHERE (SELECT COUNT(*) FROM \`pos_analytics.order_items\` WHERE price > 100) > 0
      `;

      const result = BigQuerySQLOptimizer.optimize(inputSql);

      expect(result.appliedOptimizations).toContain('EXISTS_REWRITE');
      expect(result.optimizedSql).toContain('WHERE EXISTS (SELECT 1 FROM `pos_analytics.order_items` WHERE price > 100)');
      expect(result.optimizedSql).not.toContain('COUNT(*)');
      expect(result.summaryOfOptimizations).toContain('## Summary of Optimizations');
      expect(result.summaryOfOptimizations).toContain('EXISTS_REWRITE');
    });

    it('2. Mandatory Rewrite: Rewrites `WHERE <col> IN (SELECT ...)` to correlated `WHERE EXISTS`', () => {
      const inputSql = `
        SELECT id, net_amount
        FROM \`pos_analytics.orders\`
        WHERE id IN (SELECT order_id FROM \`pos_analytics.order_items\` WHERE quantity > 2)
      `;

      const result = BigQuerySQLOptimizer.optimize(inputSql);

      expect(result.appliedOptimizations).toContain('EXISTS_REWRITE');
      expect(result.optimizedSql).toContain('WHERE EXISTS (SELECT 1 FROM `pos_analytics.order_items` WHERE quantity > 2 AND `pos_analytics.order_items`.order_id = id)');
      expect(result.summaryOfOptimizations).toContain('correlated `WHERE EXISTS');
    });

    it('3. Conditional Rewrite: Replaces `UNION` with `UNION ALL` when allowUnionAll is true', () => {
      const inputSql = `
        SELECT id FROM \`pos_analytics.orders_dine_in\`
        UNION
        SELECT id FROM \`pos_analytics.orders_takeaway\`
      `;

      // Without flag
      const unoptimized = BigQuerySQLOptimizer.optimize(inputSql);
      expect(unoptimized.appliedOptimizations).not.toContain('UNION_ALL_REWRITE');
      expect(unoptimized.optimizedSql).toContain('UNION\n');

      // With flag
      const optimized = BigQuerySQLOptimizer.optimize(inputSql, { allowUnionAll: true });
      expect(optimized.appliedOptimizations).toContain('UNION_ALL_REWRITE');
      expect(optimized.optimizedSql).toContain('UNION ALL');
      expect(optimized.optimizedSql).not.toMatch(/\bUNION\b(?!\s+ALL)/);
    });

    it('4. Conditional Rewrite: Replaces `COUNT(DISTINCT col)` with `APPROX_COUNT_DISTINCT` when enabled', () => {
      const inputSql = `
        SELECT DATE(paid_at), COUNT(DISTINCT customer_name) AS unique_customers
        FROM \`pos_analytics.orders\`
        GROUP BY 1
      `;

      // Without flag
      const exact = BigQuerySQLOptimizer.optimize(inputSql);
      expect(exact.appliedOptimizations).not.toContain('APPROX_COUNT_DISTINCT');
      expect(exact.optimizedSql).toContain('COUNT(DISTINCT customer_name)');

      // With flag
      const approx = BigQuerySQLOptimizer.optimize(inputSql, { allowApproxCountDistinct: true });
      expect(approx.appliedOptimizations).toContain('APPROX_COUNT_DISTINCT');
      expect(approx.optimizedSql).toContain('APPROX_COUNT_DISTINCT(customer_name)');
    });

    it('5. Column Pruning Audit: Flags SELECT * and recommends explicit projection', () => {
      const inputSql = `
        SELECT *
        FROM \`pos_analytics.orders\`
        WHERE store_id = 'store-001'
      `;

      const result = BigQuerySQLOptimizer.optimize(inputSql);

      expect(result.appliedOptimizations).toContain('COLUMN_PRUNING');
      expect(result.summaryOfOptimizations).toContain('COLUMN_PRUNING');
      expect(result.summaryOfOptimizations).toContain('Detected `SELECT *`');
    });

    it('6. Summary of Optimizations formats correctly when query is already clean', () => {
      const inputSql = `
        SELECT id, net_amount
        FROM \`pos_analytics.orders\`
        WHERE store_id = 'store-001'
      `;

      const result = BigQuerySQLOptimizer.optimize(inputSql);

      expect(result.appliedOptimizations).toHaveLength(0);
      expect(result.summaryOfOptimizations).toContain('No rewrites required');
    });
  });

  describe('BigQueryAnalyticsQueries - Execution Best Practices & Query Construction', () => {
    const filter = {
      storeId: 'store-demo-123',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
    };

    it('7. getDailySalesAnalyticsQuery applies predicate pushdown, CTEs, and early aggregation', () => {
      const query = BigQueryAnalyticsQueries.getDailySalesAnalyticsQuery(filter);

      expect(query).toContain('WITH filtered_orders AS (');
      expect(query).toContain("WHERE store_id = 'store-demo-123'");
      expect(query).toContain("BETWEEN '2026-10-01' AND '2026-10-15'");
      expect(query).toContain("payment_status = 'PAID'");
      expect(query).toContain('channel_agg AS (');
      expect(query).toContain('GROUP BY sale_date, order_channel');
      expect(query).toContain('SAFE_DIVIDE');
      expect(query).not.toContain('SELECT *');
    });

    it('8. getTopSellingItemsQuery utilizes WHERE EXISTS, window functions, and early aggregation', () => {
      const query = BigQueryAnalyticsQueries.getTopSellingItemsQuery({
        ...filter,
        limit: 5,
      });

      expect(query).toContain('WHERE EXISTS (');
      expect(query).toContain('SELECT 1 FROM filtered_orders');
      expect(query).toContain('DENSE_RANK() OVER (ORDER BY total_quantity DESC)');
      expect(query).toContain('LIMIT 5');
      expect(query).not.toContain('SELECT *');
    });

    it('9. getPeakHoursHeatmapQuery formats Asian/Bangkok timezone and hourly aggregations', () => {
      const query = BigQueryAnalyticsQueries.getPeakHoursHeatmapQuery(filter);

      expect(query).toContain("DATETIME(paid_at, 'Asia/Bangkok')");
      expect(query).toContain('COUNT(1) AS order_count');
      expect(query).toContain('ROUND(AVG(net_amount), 2) AS average_ticket_size');
      expect(query).toContain('ORDER BY sale_hour ASC');
    });
  });

  describe('BigQueryAnalyticsDDL - Partitioning & Clustering Schema Definitions', () => {
    it('10. createOrdersTable enforces date partitioning and multi-column clustering', () => {
      const ddl = BigQueryAnalyticsDDL.createOrdersTable;

      expect(ddl).toContain('CREATE TABLE IF NOT EXISTS `pos_analytics.orders`');
      expect(ddl).toContain('PARTITION BY DATE(paid_at)');
      expect(ddl).toContain('CLUSTER BY store_id, order_channel, payment_status');
      expect(ddl).toContain('require_partition_filter = TRUE');
    });

    it('11. createOrderItemsTable defines date partitioning and item clustering', () => {
      const ddl = BigQueryAnalyticsDDL.createOrderItemsTable;

      expect(ddl).toContain('CREATE TABLE IF NOT EXISTS `pos_analytics.order_items`');
      expect(ddl).toContain('PARTITION BY DATE(created_at)');
      expect(ddl).toContain('CLUSTER BY store_id, menu_item_id');
    });

    it('12. createDailyStoreSummaryView provides pre-aggregated analytics view', () => {
      const ddl = BigQueryAnalyticsDDL.createDailyStoreSummaryView;

      expect(ddl).toContain('CREATE OR REPLACE VIEW `pos_analytics.v_daily_store_summary`');
      expect(ddl).toContain("WHERE payment_status = 'PAID'");
      expect(ddl).toContain('GROUP BY 1, 2, 3');
    });
  });
});
