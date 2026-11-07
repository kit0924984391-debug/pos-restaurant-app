import {
  OptimizationRule,
  OptimizationResult,
  OptimizerOptions,
} from './types';

export class BigQuerySQLOptimizer {
  /**
   * Optimizes a BigQuery SQL query according to execution best practices and performance tuning rules.
   */
  static optimize(sqlInput: string, options: OptimizerOptions = {}): OptimizationResult {
    let sql = sqlInput.trim();
    const applied: OptimizationRule[] = [];
    const changeDescriptions: string[] = [];

    // 1. Mandatory Rewrite: WHERE (SELECT COUNT(*) FROM ...) > 0 -> WHERE EXISTS (SELECT 1 FROM ...)
    const countGtZeroRegex = /WHERE\s*\(\s*SELECT\s+COUNT\s*\(\s*\*\s*\)\s+FROM\s+([^\s)]+)(?:\s+WHERE\s+([^)]+))?\s*\)\s*>\s*0/gi;
    if (countGtZeroRegex.test(sql)) {
      sql = sql.replace(countGtZeroRegex, (_match, table, whereClause) => {
        const innerWhere = whereClause ? ` WHERE ${whereClause}` : '';
        return `WHERE EXISTS (SELECT 1 FROM ${table}${innerWhere})`;
      });
      applied.push('EXISTS_REWRITE');
      changeDescriptions.push(
        'Rewrote `WHERE (SELECT COUNT(*) ...) > 0` to `WHERE EXISTS (SELECT 1 FROM ...)` to enable early semi-join termination and avoid full subquery materialization.'
      );
    }

    // 2. Mandatory Rewrite: WHERE <col> IN (SELECT <inner_col> FROM <table> WHERE <cond>) -> WHERE EXISTS (...)
    const inSubqueryRegex = /WHERE\s+([`"'\w.]+)\s+IN\s*\(\s*SELECT\s+([`"'\w.]+)\s+FROM\s+([`"'\w.]+)(?:\s+WHERE\s+([^)]+))?\s*\)/gi;
    if (inSubqueryRegex.test(sql)) {
      sql = sql.replace(inSubqueryRegex, (_match, outerCol, innerCol, innerTable, innerWhere) => {
        const correlationCondition = `${innerTable}.${innerCol} = ${outerCol}`;
        const combinedWhere = innerWhere ? `${innerWhere} AND ${correlationCondition}` : correlationCondition;
        return `WHERE EXISTS (SELECT 1 FROM ${innerTable} WHERE ${combinedWhere})`;
      });
      applied.push('EXISTS_REWRITE');
      changeDescriptions.push(
        'Rewrote `WHERE <col> IN (SELECT ...)` to correlated `WHERE EXISTS (SELECT 1 FROM ...)` to enable BigQuery hash semi-joins and eliminate redundant sorting.'
      );
    }

    // 3. Conditional Rewrite: UNION -> UNION ALL (skips expensive deduplication)
    if (options.allowUnionAll) {
      const pureUnionRegex = /\bUNION\b(?!\s+ALL)/gi;
      if (pureUnionRegex.test(sql)) {
        sql = sql.replace(pureUnionRegex, 'UNION ALL');
        applied.push('UNION_ALL_REWRITE');
        changeDescriptions.push(
          'Replaced `UNION` with `UNION ALL` to skip distinct deduplication phase and reduce shuffle memory overhead.'
        );
      }
    }

    // 4. Conditional Rewrite: COUNT(DISTINCT col) -> APPROX_COUNT_DISTINCT(col)
    if (options.allowApproxCountDistinct) {
      const countDistinctRegex = /COUNT\s*\(\s*DISTINCT\s+([^)]+)\s*\)/gi;
      if (countDistinctRegex.test(sql)) {
        sql = sql.replace(countDistinctRegex, 'APPROX_COUNT_DISTINCT($1)');
        applied.push('APPROX_COUNT_DISTINCT');
        changeDescriptions.push(
          'Replaced exact `COUNT(DISTINCT)` with `APPROX_COUNT_DISTINCT()` using HyperLogLog++ for massive concurrency and lower memory usage.'
        );
      }
    }

    // 5. Column Pruning Audit: Flag SELECT *
    if (/\bSELECT\s+(?:DISTINCT\s+)?\*(?:\s+FROM|\s*,|\s*$)/i.test(sql)) {
      applied.push('COLUMN_PRUNING');
      changeDescriptions.push(
        'Detected `SELECT *`: Recommended explicit column projection to minimize bytes scanned and lower BigQuery on-demand analysis cost.'
      );
    }

    // Format Summary of Optimizations section as required by BigQuery SQL guidelines
    const summaryHeader = '## Summary of Optimizations\n';
    const summaryBody =
      changeDescriptions.length > 0
        ? changeDescriptions.map((desc, i) => `${i + 1}. **${applied[i]}**: ${desc}`).join('\n')
        : 'No rewrites required; query already adheres to BigQuery execution best practices.';

    const summaryOfOptimizations = `${summaryHeader}${summaryBody}`;

    return {
      originalSql: sqlInput,
      optimizedSql: sql,
      appliedOptimizations: applied,
      summaryOfOptimizations,
    };
  }
}
