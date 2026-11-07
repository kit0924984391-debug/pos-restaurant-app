/**
 * API and Interface Design - Contract Auditor
 * Implements architectural verification for:
 * - Hyrum's Law (no leaked internal implementation details)
 * - The One-Version Rule & Prefer Addition Over Modification (backward compatibility)
 * - Predictable Naming (boolean prefixes, UPPER_SNAKE enum conventions, camelCase properties)
 * - Input/Output Separation (client inputs vs server-generated attributes)
 */

export interface FieldContractDef {
  type: string;
  optional?: boolean;
}

export interface CompatibilityReport {
  compatible: boolean;
  breakingChanges: string[];
  safeAdditions: string[];
}

export class ApiContractAuditor {
  private static LEAK_PATTERNS = [
    /password/i,
    /secret/i,
    /hash/i,
    /token_secret/i,
    /stack_?trace/i,
    /__v$/,
    /_raw/i,
    /internal/i,
    /sql_?query/i,
  ];

  /**
   * Hyrum's Law Audit: Detects leaked internal or sensitive implementation details in public payloads
   */
  static checkImplementationLeaks(payload: Record<string, unknown>): string[] {
    const leaks: string[] = [];

    const inspectObject = (obj: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        for (const pattern of this.LEAK_PATTERNS) {
          if (pattern.test(key)) {
            leaks.push(`Property '${fullPath}' matches sensitive/internal leak pattern: ${pattern.toString()}`);
            break;
          }
        }
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          inspectObject(value as Record<string, unknown>, fullPath);
        }
      }
    };

    inspectObject(payload);
    return leaks;
  }

  /**
   * Predictable Naming: Validates boolean property names (must start with is/has/can/should)
   */
  static checkBooleanNaming(propName: string): boolean {
    return /^(is|has|can|should)[A-Z0-9]/.test(propName);
  }

  /**
   * Predictable Naming: Validates enum values (must follow UPPER_SNAKE_CASE)
   */
  static checkEnumConvention(enumValue: string): boolean {
    return /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(enumValue);
  }

  /**
   * Input/Output Separation: Ensures client input schemas do not require server-managed properties
   */
  static checkInputOutputSeparation(
    inputKeys: string[],
    serverKeys = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'version']
  ): { valid: boolean; violations: string[] } {
    const violations = inputKeys.filter((key) => serverKeys.includes(key));
    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Prefer Addition Over Modification (One-Version Rule):
   * Verifies that new schema revisions do not break existing consumers.
   */
  static checkBackwardCompatibility(
    oldSchema: Record<string, FieldContractDef>,
    newSchema: Record<string, FieldContractDef>
  ): CompatibilityReport {
    const breakingChanges: string[] = [];
    const safeAdditions: string[] = [];

    // 1. Check for removed or modified fields from oldSchema
    for (const [key, oldDef] of Object.entries(oldSchema)) {
      const newDef = newSchema[key];
      if (!newDef) {
        breakingChanges.push(`Field '${key}' was removed from the contract. This breaks existing consumers.`);
      } else if (newDef.type !== oldDef.type) {
        breakingChanges.push(
          `Field '${key}' changed type from '${oldDef.type}' to '${newDef.type}'. Breaking change.`
        );
      } else if (!oldDef.optional && newDef.optional) {
        // Old was required, new is optional (usually safe, but consumer expects it)
      } else if (oldDef.optional && !newDef.optional) {
        breakingChanges.push(
          `Field '${key}' changed from optional to required. This breaks existing callers who omit this field.`
        );
      }
    }

    // 2. Check newly added fields in newSchema
    for (const [key, newDef] of Object.entries(newSchema)) {
      if (!oldSchema[key]) {
        if (!newDef.optional) {
          breakingChanges.push(
            `New field '${key}' is required. New fields MUST be optional to maintain backward compatibility.`
          );
        } else {
          safeAdditions.push(`New optional field '${key}' successfully added.`);
        }
      }
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      safeAdditions,
    };
  }
}
