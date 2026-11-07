/**
 * BigQuery SQL Analytics & Optimization Types
 * Follows Google BigQuery query optimization rules and execution best practices.
 */

export type OptimizationRule =
  | 'COLUMN_PRUNING'
  | 'PREDICATE_PUSHDOWN'
  | 'EXISTS_REWRITE'
  | 'UNION_ALL_REWRITE'
  | 'APPROX_COUNT_DISTINCT'
  | 'COMMON_SUBEXPRESSION'
  | 'EARLY_AGGREGATION';

export interface OptimizationResult {
  originalSql: string;
  optimizedSql: string;
  appliedOptimizations: OptimizationRule[];
  summaryOfOptimizations: string;
}

export interface OptimizerOptions {
  allowUnionAll?: boolean;
  allowApproxCountDistinct?: boolean;
  warnOnSelectAll?: boolean;
}

export interface DateRangeFilter {
  storeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}
