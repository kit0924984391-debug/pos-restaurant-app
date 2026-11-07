import { describe, it, expect } from 'vitest';
import {
  BigQueryDataAutocleaner,
  POSAutocleaningPipelines,
  TableProfile,
} from '@/lib/data-autocleaning';

describe('Data Autocleaning & Transformation Engine (Dataplex / BigQuery Standards)', () => {
  describe('1. SQL Generator Rules (Garbage values, Multi-format Parsing, Safe Types)', () => {
    it('generates multi-format timestamp parsing with COALESCE and SAFE.PARSE_TIMESTAMP', () => {
      const sql = BigQueryDataAutocleaner.generateMultiFormatTimestampSql('raw_created_at', 'created_at');

      expect(sql).toContain('COALESCE(');
      expect(sql).toContain("SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ'");
      expect(sql).toContain("SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S'");
      expect(sql).toContain("SAFE.PARSE_TIMESTAMP('%Y-%m-%d'");
      expect(sql).toContain('AS created_at');
    });

    it('cleanses numeric and currency strings with zero-length string converted to NULL', () => {
      const sql = BigQueryDataAutocleaner.generateNumericCleansingSql('raw_price', 'clean_price');

      expect(sql).toContain("NULLIF(TRIM(raw_price), '')");
      expect(sql).toContain("r'[฿$,\\s]|THB'");
      expect(sql).toContain('SAFE_CAST(');
      expect(sql).toContain('AS NUMERIC) AS clean_price');
    });

    it('generates JSON extraction with SAFE.PARSE_JSON and accessors without SAFE. prefix', () => {
      const sql = BigQueryDataAutocleaner.generateJsonExtractionSql(
        'payload_str',
        '$.order.total',
        'JSON_VALUE',
        'order_total'
      );

      expect(sql).toContain('SAFE.PARSE_JSON(payload_str)');
      expect(sql).toContain("JSON_VALUE(SAFE.PARSE_JSON(payload_str), '$.order.total') AS order_total");
      expect(sql).not.toContain('SAFE.JSON_VALUE');
      expect(sql).not.toContain('JSON_EXTRACT');
    });

    it('rejects deprecated or invalid JSON accessor with SAFE. prefix', () => {
      expect(() => {
        // @ts-expect-error testing invalid accessor parameter
        BigQueryDataAutocleaner.generateJsonExtractionSql('payload_str', '$.id', 'SAFE.JSON_VALUE');
      }).toThrow(/must not have SAFE. prefix/);
    });
  });

  describe('2. Array & Struct Handling (Null removal, Case preservation, Deduplication)', () => {
    it('generates array cleansing that removes nulls, deduplicates, and preserves case', () => {
      const sql = BigQueryDataAutocleaner.generateArrayCleansingSql('raw_options', {
        removeNulls: true,
        deduplicate: true,
        trimStrings: true,
      }, 'options');

      expect(sql).toContain('ARRAY_FILTER(');
      expect(sql).toContain('e -> e IS NOT NULL');
      expect(sql).toContain('ARRAY_TRANSFORM(');
      expect(sql).toContain('e -> TRIM(e)');
      expect(sql).toContain('ARRAY(SELECT DISTINCT item FROM UNNEST(');
      // Strictly verify no case alteration
      expect(sql).not.toContain('LOWER');
      expect(sql).not.toContain('UPPER');
    });

    it('generates struct field alignment with safe casting and case-preserving trim', () => {
      const sql = BigQueryDataAutocleaner.generateStructCleansingSql(
        'customer_info',
        [
          { name: 'name', type: 'STRING' },
          { name: 'age', type: 'INT64' },
        ],
        'cleaned_customer'
      );

      expect(sql).toContain('TRIM(customer_info.name) AS name');
      expect(sql).toContain('SAFE_CAST(customer_info.age AS INT64) AS age');
      expect(sql).toContain('STRUCT(');
    });
  });

  describe('3. Profiling Comparison & Anomaly Detection (>1% NULL Increase Threshold)', () => {
    const sourceProfile: TableProfile = {
      tableRef: 'raw_webhooks.orders',
      rowCount: 10000,
      scannedAt: '2026-10-16T10:00:00Z',
      dataplexJobId: 'dataplex-scan-source-001',
      columns: {
        paid_at: {
          columnName: 'paid_at',
          totalCount: 10000,
          nullCount: 200,
          nullRate: 0.02, // 2% nulls
          distinctCount: 9500,
        },
        amount: {
          columnName: 'amount',
          totalCount: 10000,
          nullCount: 50,
          nullRate: 0.005, // 0.5% nulls
          distinctCount: 300,
          minValue: 20,
        },
      },
    };

    it('detects anomaly when NULL rate increases by more than 1% (> 0.01)', () => {
      const targetProfileWithHighNulls: TableProfile = {
        tableRef: 'pos_analytics.orders',
        rowCount: 10000,
        scannedAt: '2026-10-16T10:15:00Z',
        dataplexJobId: 'dataplex-scan-target-002',
        columns: {
          paid_at: {
            columnName: 'paid_at',
            totalCount: 10000,
            nullCount: 350,
            nullRate: 0.035, // 3.5% nulls -> +1.5% increase (exceeds 1% threshold)
            distinctCount: 9500,
          },
        },
      };

      const anomalies = BigQueryDataAutocleaner.compareProfiles(sourceProfile, targetProfileWithHighNulls);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].anomalyType).toBe('NULL_INCREASE');
      expect(anomalies[0].columnName).toBe('paid_at');
      expect(anomalies[0].differencePercent).toBeCloseTo(1.5, 1);
      expect(anomalies[0].requiresReview).toBe(true);
    });

    it('passes when NULL increase is within the 1% threshold or expected', () => {
      const targetProfileNormal: TableProfile = {
        tableRef: 'pos_analytics.orders',
        rowCount: 10000,
        scannedAt: '2026-10-16T10:15:00Z',
        columns: {
          paid_at: {
            columnName: 'paid_at',
            totalCount: 10000,
            nullCount: 250,
            nullRate: 0.025, // 2.5% nulls -> +0.5% increase (<= 1%)
            distinctCount: 9500,
          },
        },
      };

      const anomalies = BigQueryDataAutocleaner.compareProfiles(sourceProfile, targetProfileNormal);
      expect(anomalies).toHaveLength(0);
    });

    it('detects value range shift anomaly when min value is lower than source', () => {
      const targetProfileShifted: TableProfile = {
        tableRef: 'pos_analytics.orders',
        rowCount: 10000,
        scannedAt: '2026-10-16T10:15:00Z',
        columns: {
          amount: {
            columnName: 'amount',
            totalCount: 10000,
            nullCount: 50,
            nullRate: 0.005,
            distinctCount: 300,
            minValue: 5, // Dropped from 20 to 5
          },
        },
      };

      const anomalies = BigQueryDataAutocleaner.compareProfiles(sourceProfile, targetProfileShifted);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].anomalyType).toBe('VALUE_RANGE_SHIFT');
      expect(anomalies[0].sourceMetric).toBe(20);
      expect(anomalies[0].targetMetric).toBe(5);
    });
  });

  describe('4. Documentation Generation (Markdown Table)', () => {
    it('generates the 4-column documentation table with correct headers and values', () => {
      const markdown = BigQueryDataAutocleaner.generateDocTableMarkdown([
        {
          destinationSchemaConsidered: 'orders.net_amount (NUMERIC)',
          issueDetected: 'String amount formatted with currency symbols (฿) and commas',
          transformationApplied: "SAFE_CAST(REGEXP_REPLACE(...) AS NUMERIC)",
          benefit: 'Provides accurate calculations without floating point errors',
        },
      ]);

      expect(markdown).toContain('| Destination schema considered | Issue Detected | Transformation Applied | Benefit |');
      expect(markdown).toContain('| **orders.net_amount (NUMERIC)** |');
      expect(markdown).toContain('`SAFE_CAST(REGEXP_REPLACE(...) AS NUMERIC)`');
      expect(markdown).toContain('Provides accurate calculations');
    });
  });

  describe('5. POS Autocleaning Pipelines (GrabFood & Delivery Items)', () => {
    it('generates GrabFood order cleansing pipeline SQL with complete doc table', () => {
      const result = POSAutocleaningPipelines.getGrabOrdersCleansingSql();

      expect(result.sql).toContain('CREATE OR REPLACE TABLE `pos_analytics.stg_grab_orders`');
      expect(result.sql).toContain('SAFE.PARSE_JSON(payload)');
      expect(result.sql).toContain('COALESCE(');
      expect(result.sql).toContain('SAFE.PARSE_TIMESTAMP');
      expect(result.docTable.length).toBeGreaterThanOrEqual(3);
    });

    it('generates Delivery items unnesting and options cleaning SQL', () => {
      const result = POSAutocleaningPipelines.getDeliveryItemsCleansingSql();

      expect(result.sql).toContain('JSON_QUERY_ARRAY(SAFE.PARSE_JSON(payload), \'$.items\')');
      expect(result.sql).toContain('CREATE OR REPLACE TABLE `pos_analytics.stg_order_items`');
      expect(result.docTable.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. In-Memory Runtime Autocleaner (Cloudflare / POS Ingestion)', () => {
    it('cleans incoming record in-memory preserving case and stripping whitespace', () => {
      const rawRecord = {
        customer_name: '  Somchai Prasert  ',
        notes: '  No Spicy Please  ',
        amount: '  ',
        tags: [' DineIn ', null, 'VIP', 'VIP', ' DineIn '],
        metadata: {
          rider_name: '  Mr. Alex  ',
          sub_amount: '',
        },
      };

      const cleaned = BigQueryDataAutocleaner.cleanseRecordInMemory(rawRecord);

      expect(cleaned.customer_name).toBe('Somchai Prasert');
      expect(cleaned.notes).toBe('No Spicy Please');
      // Case strictly preserved
      expect(cleaned.notes).not.toBe('no spicy please');
      // Empty string for amount converted to null
      expect(cleaned.amount).toBeNull();
      // Array trimmed, null removed, deduplicated, case preserved
      expect(cleaned.tags).toEqual(['DineIn', 'VIP']);
      // Nested object cleaned
      expect(cleaned.metadata.rider_name).toBe('Mr. Alex');
      expect(cleaned.metadata.sub_amount).toBeNull();
    });
  });
});
