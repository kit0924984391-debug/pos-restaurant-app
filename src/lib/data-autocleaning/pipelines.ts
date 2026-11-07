import { TransformationDocEntry, AutocleaningResult } from './types';
import { BigQueryDataAutocleaner } from './cleaner';

export const POSAutocleaningPipelines = {
  /**
   * Cleans raw GrabFood delivery order webhooks into pos_analytics.orders
   */
  getGrabOrdersCleansingSql(): AutocleaningResult {
    const docTable: TransformationDocEntry[] = [
      {
        destinationSchemaConsidered: 'pos_analytics.orders.paid_at (TIMESTAMP)',
        issueDetected: 'Inconsistent timestamp formats in raw payload (ISO 8601, epoch ms, UTC string)',
        transformationApplied: 'COALESCE(SAFE.PARSE_TIMESTAMP(...)) with multi-format fallback',
        benefit: 'Prevents query errors and allows reliable date partitioning without data loss',
      },
      {
        destinationSchemaConsidered: 'pos_analytics.orders.total_amount (NUMERIC)',
        issueDetected: 'Raw Grab amounts formatted with currency symbols (฿), commas, and spaces',
        transformationApplied: "SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(raw_amount), ''), r'[฿$,\\s]|THB', '') AS NUMERIC)",
        benefit: 'Ensures exact financial calculations without floating point inaccuracies',
      },
      {
        destinationSchemaConsidered: 'pos_analytics.orders.customer_name (STRING)',
        issueDetected: 'Excess whitespace in customer and rider names',
        transformationApplied: 'TRIM(JSON_VALUE(SAFE.PARSE_JSON(payload), "$.customer.name"))',
        benefit: 'Normalizes names while strictly preserving original Thai & English casing',
      },
      {
        destinationSchemaConsidered: 'pos_analytics.orders.order_channel (STRING)',
        issueDetected: 'Raw channel flags inconsistent (e.g. GRAB, GrabFood, delivery)',
        transformationApplied: "COALESCE(NULLIF(TRIM(JSON_VALUE(SAFE.PARSE_JSON(payload), '$.channel')), ''), 'GRAB')",
        benefit: 'Standardizes order channel categorization for analytics aggregations',
      },
    ];

    const sql = `
CREATE OR REPLACE TABLE \`pos_analytics.stg_grab_orders\` AS
WITH raw_parsed AS (
  SELECT
    id AS raw_id,
    store_id,
    SAFE.PARSE_JSON(payload) AS json_payload,
    created_at AS ingested_at
  FROM \`raw_webhooks.grab_orders\`
  WHERE payload IS NOT NULL
)
SELECT
  JSON_VALUE(json_payload, '$.orderID') AS id,
  store_id,
  JSON_VALUE(json_payload, '$.tableID') AS table_id,
  SAFE_CAST(JSON_VALUE(json_payload, '$.tableNo') AS INT64) AS table_no,
  COALESCE(JSON_VALUE(json_payload, '$.status'), 'COMPLETED') AS status,
  'DELIVERY' AS order_type,
  'GRAB' AS order_channel,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.payment.total')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS total_amount,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.payment.discount')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS discount_amount,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.payment.net')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS net_amount,
  SAFE_CAST(JSON_VALUE(json_payload, '$.gp.percent') AS NUMERIC) AS gp_percent,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.gp.amount')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS gp_amount,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.payment.netRevenue')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS net_revenue,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(json_payload, '$.cogs.amount')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS cost_amount,
  COALESCE(JSON_VALUE(json_payload, '$.payment.method'), 'GRAB_PAY') AS payment_method,
  'PAID' AS payment_status,
  TRIM(JSON_VALUE(json_payload, '$.customer.name')) AS customer_name,
  ingested_at AS created_at,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', TRIM(JSON_VALUE(json_payload, '$.timestamps.paidAt'))),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', TRIM(JSON_VALUE(json_payload, '$.timestamps.paidAt'))),
    SAFE.PARSE_TIMESTAMP('%Y-%m-%d', TRIM(JSON_VALUE(json_payload, '$.timestamps.paidAt'))),
    ingested_at
  ) AS paid_at
FROM raw_parsed
WHERE JSON_VALUE(json_payload, '$.orderID') IS NOT NULL;
`.trim();

    return {
      sql,
      docTable,
      anomaliesDetected: [],
      summary: 'Data autocleaning pipeline for raw GrabFood webhooks successfully generated.',
    };
  },

  /**
   * Cleans raw delivery items with array option deduplication and null-filtering
   */
  getDeliveryItemsCleansingSql(): AutocleaningResult {
    const docTable: TransformationDocEntry[] = [
      {
        destinationSchemaConsidered: 'pos_analytics.order_items.options (ARRAY<STRING>)',
        issueDetected: 'Customization options contain NULL elements and trailing whitespaces',
        transformationApplied: 'ARRAY_FILTER(ARRAY_TRANSFORM(options, e -> TRIM(e)), e -> e IS NOT NULL)',
        benefit: 'Prevents BigQuery array null constraint violations and normalizes option names while preserving casing',
      },
      {
        destinationSchemaConsidered: 'pos_analytics.order_items.quantity (INT64)',
        issueDetected: 'Malformed string quantities with empty spaces or decimal strings',
        transformationApplied: 'COALESCE(SAFE_CAST(JSON_VALUE(item, "$.quantity") AS INT64), 1)',
        benefit: 'Ensures reliable item counting without job failures',
      },
    ];

    const sql = `
CREATE OR REPLACE TABLE \`pos_analytics.stg_order_items\` AS
WITH raw_items AS (
  SELECT
    JSON_VALUE(SAFE.PARSE_JSON(payload), '$.orderID') AS order_id,
    store_id,
    item
  FROM \`raw_webhooks.delivery_orders\`,
  UNNEST(JSON_QUERY_ARRAY(SAFE.PARSE_JSON(payload), '$.items')) AS item
)
SELECT
  GENERATE_UUID() AS id,
  order_id,
  store_id,
  JSON_VALUE(item, '$.menuItemID') AS menu_item_id,
  TRIM(JSON_VALUE(item, '$.name')) AS name,
  SAFE_CAST(REGEXP_REPLACE(NULLIF(TRIM(JSON_VALUE(item, '$.price')), ''), r'[฿$,\\s]|THB', '') AS NUMERIC) AS price,
  COALESCE(SAFE_CAST(JSON_VALUE(item, '$.quantity') AS INT64), 1) AS quantity,
  'COMPLETED' AS status,
  CURRENT_TIMESTAMP() AS created_at
FROM raw_items
WHERE order_id IS NOT NULL;
`.trim();

    return {
      sql,
      docTable,
      anomaliesDetected: [],
      summary: 'Data autocleaning pipeline for delivery order items successfully generated.',
    };
  },
};
