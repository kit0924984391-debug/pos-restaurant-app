/**
 * Data Autocleaning & Transformation Types for BigQuery / Dataform Pipelines
 * Strictly follows Google Dataplex profiling & BigQuery data cleaning standards.
 */

export interface ColumnProfile {
  columnName: string;
  totalCount: number;
  nullCount: number;
  nullRate: number; // 0.0 to 1.0 (percentage / 100)
  distinctCount: number;
  minValue?: string | number | null;
  maxValue?: string | number | null;
  sampleValues?: string[];
  inferredType?: string;
}

export interface TableProfile {
  tableRef: string;
  rowCount: number;
  scannedAt: string;
  columns: Record<string, ColumnProfile>;
  dataplexJobId?: string;
}

export interface ProfileAnomaly {
  columnName: string;
  anomalyType: 'NULL_INCREASE' | 'VALUE_RANGE_SHIFT' | 'UNEXPECTED_FORMAT';
  sourceMetric: string | number;
  targetMetric: string | number;
  differencePercent?: number;
  description: string;
  requiresReview: boolean;
}

export interface TransformationDocEntry {
  destinationSchemaConsidered: string;
  issueDetected: string;
  transformationApplied: string;
  benefit: string;
}

export interface AutocleaningResult {
  sql: string;
  docTable: TransformationDocEntry[];
  anomaliesDetected: ProfileAnomaly[];
  summary: string;
}

export interface TargetFieldSchema {
  name: string;
  type: 'STRING' | 'INT64' | 'NUMERIC' | 'TIMESTAMP' | 'DATE' | 'BOOLEAN' | 'JSON' | 'ARRAY<STRING>' | 'ARRAY<INT64>' | 'STRUCT';
  nullable?: boolean;
  format?: string;
  description?: string;
}

export interface TargetTableSchema {
  tableId: string;
  fields: TargetFieldSchema[];
  partitionField?: string;
  clusterFields?: string[];
}
