import { DateRangeFilter } from './types';

/**
 * Production-ready, optimized BigQuery SQL queries for Restaurant POS analytics.
 * Strictly adheres to:
 * - Predicate Pushdown (partition and clustering filters applied at earliest CTE stage)
 * - Column Pruning (no SELECT *)
 * - Early Aggregation (GROUP BY before JOINs)
 * - Common Subexpression Reuse (CTEs for repeated transformations)
 */

export const BigQueryAnalyticsQueries = {
  /**
   * Daily sales and revenue summary with channel breakdowns
   */
  getDailySalesAnalyticsQuery(params: DateRangeFilter): string {
    return `
WITH filtered_orders AS (
  -- Predicate Pushdown: filter partition date and cluster key early
  SELECT
    id AS order_id,
    store_id,
    DATE(paid_at) AS sale_date,
    order_channel,
    payment_method,
    total_amount,
    discount_amount,
    net_amount,
    COALESCE(gp_amount, 0) AS gp_amount,
    COALESCE(cost_amount, 0) AS cost_amount
  FROM \`pos_analytics.orders\`
  WHERE store_id = '${params.storeId}'
    AND DATE(paid_at) BETWEEN '${params.startDate}' AND '${params.endDate}'
    AND payment_status = 'PAID'
),
channel_agg AS (
  -- Early Aggregation: group by channel before joining
  SELECT
    sale_date,
    order_channel,
    COUNT(order_id) AS total_bills,
    SUM(total_amount) AS gross_sales,
    SUM(discount_amount) AS total_discounts,
    SUM(net_amount) AS net_sales,
    SUM(gp_amount) AS total_gp_deducted,
    SUM(net_amount - gp_amount) AS net_revenue_received,
    SUM(cost_amount) AS total_cogs
  FROM filtered_orders
  GROUP BY sale_date, order_channel
)
SELECT
  sale_date,
  order_channel,
  total_bills,
  gross_sales,
  total_discounts,
  net_sales,
  total_gp_deducted,
  net_revenue_received,
  total_cogs,
  ROUND(net_revenue_received - total_cogs, 2) AS gross_profit,
  SAFE_DIVIDE(ROUND(net_revenue_received - total_cogs, 2), net_revenue_received) * 100 AS profit_margin_percent
FROM channel_agg
ORDER BY sale_date DESC, net_sales DESC;
`.trim();
  },

  /**
   * Top-selling dishes analysis using Window Functions and early filtering
   */
  getTopSellingItemsQuery(params: DateRangeFilter & { limit?: number }): string {
    const limit = params.limit || 10;
    return `
WITH filtered_orders AS (
  SELECT id AS order_id
  FROM \`pos_analytics.orders\`
  WHERE store_id = '${params.storeId}'
    AND DATE(paid_at) BETWEEN '${params.startDate}' AND '${params.endDate}'
    AND payment_status = 'PAID'
),
item_sales AS (
  -- Early Aggregation of order items filtered by existing paid orders
  SELECT
    items.name AS dish_name,
    items.menu_item_id,
    SUM(items.quantity) AS total_quantity,
    SUM(items.price * items.quantity) AS total_revenue
  FROM \`pos_analytics.order_items\` AS items
  WHERE EXISTS (
    SELECT 1 FROM filtered_orders WHERE filtered_orders.order_id = items.order_id
  )
  GROUP BY items.name, items.menu_item_id
)
SELECT
  dish_name,
  menu_item_id,
  total_quantity,
  total_revenue,
  DENSE_RANK() OVER (ORDER BY total_quantity DESC) AS sales_rank
FROM item_sales
ORDER BY total_quantity DESC
LIMIT ${limit};
`.trim();
  },

  /**
   * Peak dining hours heatmap query (0-23 hours)
   */
  getPeakHoursHeatmapQuery(params: DateRangeFilter): string {
    return `
WITH filtered_orders AS (
  SELECT
    EXTRACT(HOUR FROM DATETIME(paid_at, 'Asia/Bangkok')) AS sale_hour,
    net_amount
  FROM \`pos_analytics.orders\`
  WHERE store_id = '${params.storeId}'
    AND DATE(paid_at) BETWEEN '${params.startDate}' AND '${params.endDate}'
    AND payment_status = 'PAID'
)
SELECT
  sale_hour,
  COUNT(1) AS order_count,
  SUM(net_amount) AS hourly_revenue,
  ROUND(AVG(net_amount), 2) AS average_ticket_size
FROM filtered_orders
GROUP BY sale_hour
ORDER BY sale_hour ASC;
`.trim();
  },
};
