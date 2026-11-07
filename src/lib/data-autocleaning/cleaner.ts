import {
  ColumnProfile,
  TableProfile,
  ProfileAnomaly,
  TransformationDocEntry,
  TargetTableSchema,
  AutocleaningResult,
} from './types';

export class BigQueryDataAutocleaner {
  /**
   * Generates type-safe BigQuery SQL for multi-format timestamps using COALESCE with SAFE.PARSE_TIMESTAMP
   */
  static generateMultiFormatTimestampSql(
    columnExpr: string,
    alias?: string
  ): string {
    const expr = `
COALESCE(
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', TRIM(${columnExpr})),
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', TRIM(${columnExpr})),
  SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', TRIM(${columnExpr})),
  SAFE.PARSE_TIMESTAMP('%Y/%m/%d %H:%M:%S', TRIM(${columnExpr})),
  SAFE.PARSE_TIMESTAMP('%a, %d %b %Y %H:%M:%S %Z', TRIM(${columnExpr})),
  SAFE.PARSE_TIMESTAMP('%Y-%m-%d', TRIM(${columnExpr}))
)`.trim();

    return alias ? `${expr} AS ${alias}` : expr;
  }

  /**
   * Cleanses numeric/currency amounts:
   * Strips currency symbols (฿, THB, $), commas, trims whitespace, converts zero-length strings to NULL.
   */
  static generateNumericCleansingSql(
    columnExpr: string,
    alias?: string
  ): string {
    const sanitizedExpr = `REGEXP_REPLACE(NULLIF(TRIM(${columnExpr}), ''), r'[฿$,\\s]|THB', '')`;
    const expr = `SAFE_CAST(${sanitizedExpr} AS NUMERIC)`;
    return alias ? `${expr} AS ${alias}` : expr;
  }

  /**
   * Generates BigQuery JSON extraction SQL following strict skill rules:
   * 1. Uses SAFE.PARSE_JSON to parse JSON strings safely.
   * 2. NEVER uses deprecated JSON_EXTRACT_*.
   * 3. Uses JSON_VALUE, JSON_QUERY, JSON_QUERY_ARRAY, JSON_VALUE_ARRAY WITHOUT SAFE. prefix (safe by default).
   */
  static generateJsonExtractionSql(
    jsonStrCol: string,
    jsonPath: string,
    accessor: 'JSON_VALUE' | 'JSON_QUERY' | 'JSON_QUERY_ARRAY' | 'JSON_VALUE_ARRAY' = 'JSON_VALUE',
    alias?: string
  ): string {
    // Assert deprecated functions are avoided
    if (accessor.startsWith('SAFE.')) {
      throw new Error(`Invalid accessor: BigQuery ${accessor} must not have SAFE. prefix as it is safe by default.`);
    }

    const parsedCol = `SAFE.PARSE_JSON(${jsonStrCol})`;
    const expr = `${accessor}(${parsedCol}, '${jsonPath}')`;
    return alias ? `${expr} AS ${alias}` : expr;
  }

  /**
   * Cleanses BigQuery arrays:
   * 1. Filters out NULL values using ARRAY_FILTER (BigQuery arrays cannot contain NULLs).
   * 2. Case preservation: only trims whitespace, DOES NOT change case (no LOWER/UPPER).
   * 3. Case-sensitive deduplication using ARRAY(SELECT DISTINCT x FROM UNNEST(...)).
   */
  static generateArrayCleansingSql(
    arrayCol: string,
    options: {
      removeNulls?: boolean;
      deduplicate?: boolean;
      trimStrings?: boolean;
    } = { removeNulls: true, deduplicate: true, trimStrings: true },
    alias?: string
  ): string {
    let expr = arrayCol;

    // 1. Trim strings while preserving case
    if (options.trimStrings) {
      expr = `ARRAY_TRANSFORM(${expr}, e -> TRIM(e))`;
    }

    // 2. Remove NULL elements
    if (options.removeNulls) {
      expr = `ARRAY_FILTER(${expr}, e -> e IS NOT NULL)`;
    }

    // 3. Case-sensitive deduplication
    if (options.deduplicate) {
      expr = `ARRAY(SELECT DISTINCT item FROM UNNEST(${expr}) AS item)`;
    }

    return alias ? `${expr} AS ${alias}` : expr;
  }

  /**
   * Generates STRUCT field extraction and alignment:
   * Trims whitespace on string fields, preserves case, casts safely, populates missing fields with NULL.
   */
  static generateStructCleansingSql(
    structCol: string,
    fields: { name: string; type: string }[],
    alias?: string
  ): string {
    const fieldExprs = fields.map((f) => {
      if (f.type === 'STRING') {
        return `TRIM(${structCol}.${f.name}) AS ${f.name}`;
      }
      return `SAFE_CAST(${structCol}.${f.name} AS ${f.type}) AS ${f.name}`;
    });

    const expr = `STRUCT(${fieldExprs.join(', ')})`;
    return alias ? `${expr} AS ${alias}` : expr;
  }

  /**
   * Quality Review: Compares source profile against post-transformation profile.
   * Identifies anomalies according to standard thresholds:
   * - NULL increase > 1% compared to source (unless expected)
   * - Value range shifts or unexpected formats
   */
  static compareProfiles(
    sourceProfile: TableProfile,
    targetProfile: TableProfile,
    allowedNullIncreases: string[] = []
  ): ProfileAnomaly[] {
    const anomalies: ProfileAnomaly[] = [];

    for (const [colName, sourceCol] of Object.entries(sourceProfile.columns)) {
      const targetCol = targetProfile.columns[colName];
      if (!targetCol) continue;

      // 1. Check NULL increase threshold (> 1% increase)
      const nullIncreasePercent = (targetCol.nullRate - sourceCol.nullRate) * 100;
      if (nullIncreasePercent > 1.0 && !allowedNullIncreases.includes(colName)) {
        anomalies.push({
          columnName: colName,
          anomalyType: 'NULL_INCREASE',
          sourceMetric: `${(sourceCol.nullRate * 100).toFixed(2)}%`,
          targetMetric: `${(targetCol.nullRate * 100).toFixed(2)}%`,
          differencePercent: Math.round(nullIncreasePercent * 100) / 100,
          description: `NULL rate increased by ${nullIncreasePercent.toFixed(2)}% (threshold: >1%). Possible over-aggressive cleansing or unparseable data.`,
          requiresReview: true,
        });
      }

      // 2. Check value range shifts
      if (
        sourceCol.minValue !== undefined &&
        targetCol.minValue !== undefined &&
        sourceCol.minValue !== null &&
        targetCol.minValue !== null
      ) {
        if (
          typeof sourceCol.minValue === 'number' &&
          typeof targetCol.minValue === 'number' &&
          targetCol.minValue < sourceCol.minValue
        ) {
          anomalies.push({
            columnName: colName,
            anomalyType: 'VALUE_RANGE_SHIFT',
            sourceMetric: sourceCol.minValue,
            targetMetric: targetCol.minValue,
            description: `Target min value (${targetCol.minValue}) is lower than source min value (${sourceCol.minValue}).`,
            requiresReview: false,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Formats documentation table as required by the Data Autocleaning skill:
   * | Field | Description |
   */
  static generateDocTableMarkdown(entries: TransformationDocEntry[]): string {
    const header = '| Destination schema considered | Issue Detected | Transformation Applied | Benefit |\n| --- | --- | --- | --- |';
    const rows = entries.map(
      (e) =>
        `| **${e.destinationSchemaConsidered}** | ${e.issueDetected} | \`${e.transformationApplied}\` | ${e.benefit} |`
    );
    return `${header}\n${rows.join('\n')}`;
  }

  /**
   * In-Memory Runtime Data Autocleaner for POS ingestion (Node.js/Cloudflare Workers)
   * Cleans incoming records before writing to SQLite / D1 or sending to analytics pipelines.
   * Adheres strictly to:
   * - Preserving case while trimming string whitespace
   * - Converting empty strings to null for numerics/dates
   * - Removing nulls and deduplicating array items without case alteration
   */
  static cleanseRecordInMemory<T extends Record<string, any>>(record: T): T {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Convert zero-length string for amount/number/date keys to null
        if (trimmed === '' && (key.includes('amount') || key.includes('price') || key.includes('date') || key.includes('at'))) {
          cleaned[key] = null;
        } else {
          // Preserve case, trim only
          cleaned[key] = trimmed;
        }
      } else if (Array.isArray(value)) {
        // Filter out nulls/undefined, trim string elements preserving case, deduplicate
        const filtered = value
          .filter((item) => item !== null && item !== undefined)
          .map((item) => (typeof item === 'string' ? item.trim() : item));
        cleaned[key] = Array.from(new Set(filtered));
      } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        cleaned[key] = this.cleanseRecordInMemory(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned as T;
  }
}
