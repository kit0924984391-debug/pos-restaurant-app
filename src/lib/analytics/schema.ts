/**
 * BigQuery Table DDL with Partitioning and Clustering for POS Analytics
 */

export const BigQueryAnalyticsDDL = {
  createOrdersTable: `
CREATE TABLE IF NOT EXISTS \`pos_analytics.orders\` (
  id STRING NOT NULL,
  store_id STRING NOT NULL,
  table_id STRING,
  table_no INT64,
  status STRING,
  order_type STRING,
  order_channel STRING,
  total_amount NUMERIC,
  discount_amount NUMERIC,
  net_amount NUMERIC,
  gp_percent NUMERIC,
  gp_amount NUMERIC,
  net_revenue NUMERIC,
  cost_amount NUMERIC,
  payment_method STRING,
  payment_status STRING,
  customer_name STRING,
  created_at TIMESTAMP,
  paid_at TIMESTAMP
)
PARTITION BY DATE(paid_at)
CLUSTER BY store_id, order_channel, payment_status
OPTIONS (
  description = "Partitioned and clustered orders table for high-efficiency reporting",
  require_partition_filter = TRUE
);
`.trim(),

  createOrderItemsTable: `
CREATE TABLE IF NOT EXISTS \`pos_analytics.order_items\` (
  id STRING NOT NULL,
  order_id STRING NOT NULL,
  store_id STRING NOT NULL,
  menu_item_id STRING,
  name STRING,
  price NUMERIC,
  quantity INT64,
  status STRING,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY store_id, menu_item_id
OPTIONS (
  description = "Order items analytics table partitioned by date and clustered by item"
);
`.trim(),

  createDailyStoreSummaryView: `
CREATE OR REPLACE VIEW \`pos_analytics.v_daily_store_summary\` AS
SELECT
  DATE(paid_at) AS sale_date,
  store_id,
  order_channel,
  COUNT(id) AS total_orders,
  SUM(net_amount) AS total_sales,
  SUM(gp_amount) AS total_gp,
  SUM(cost_amount) AS total_cogs,
  SUM(net_revenue) AS net_revenue
FROM \`pos_analytics.orders\`
WHERE payment_status = 'PAID'
GROUP BY 1, 2, 3;
`.trim(),
};
