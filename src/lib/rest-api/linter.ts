import { RestHttpMethod, RestLintViolation } from './types';

/**
 * REST API Linter & Convention Validator
 * Audits API endpoints against RESTful architectural principles.
 */
export class RestApiLinter {
  private static VERB_PATTERNS = [
    /^(get|create|update|delete|fetch|find|remove|add|list|edit|save|insert)([A-Z0-9_-]|$)/i,
    /([_-])(get|create|update|delete|fetch|find|remove|add|list|edit|save|insert)([A-Z0-9_-]|$)/i,
    /\b(get|create|update|delete|fetch|find|remove|add|list|edit|save|insert)\b/i,
  ];

  /**
   * Lints a REST endpoint path and HTTP method against REST design guidelines
   */
  static lintEndpoint(path: string, method: RestHttpMethod): RestLintViolation[] {
    const violations: RestLintViolation[] = [];
    const normalizedPath = path.trim();

    // 1. Trailing slash check
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      violations.push({
        rule: 'TRAILING_SLASH',
        message: `Endpoint '${normalizedPath}' has a trailing slash. REST paths should omit trailing slashes.`,
        path: normalizedPath,
        method,
        suggestion: normalizedPath.replace(/\/+$/, ''),
      });
    }

    // 2. Action verbs in path segments check (Bad: /api/getUsers, /api/users/123/delete)
    const segments = normalizedPath.split('/').filter(Boolean);
    for (const segment of segments) {
      // Ignore dynamic parameters like [id], [slug], or raw IDs
      if (segment.startsWith('[') && segment.endsWith(']')) continue;
      if (/^\d+$/.test(segment)) continue;
      if (/^[0-9a-f-]{36}$/i.test(segment)) continue;

      for (const pattern of this.VERB_PATTERNS) {
        if (pattern.test(segment)) {
          violations.push({
            rule: 'RESOURCE_NAMING_VERB',
            message: `Segment '${segment}' in path '${normalizedPath}' contains an action verb. REST APIs must use nouns for resources.`,
            path: normalizedPath,
            method,
            suggestion: `Use HTTP method '${method}' on the resource noun instead of embedding actions in the URL.`,
          });
          break;
        }
      }
    }

    return violations;
  }

  /**
   * Verifies if an HTTP method is idempotent according to REST specification
   */
  static isIdempotent(method: RestHttpMethod): boolean {
    switch (method.toUpperCase()) {
      case 'GET':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
      case 'HEAD':
      case 'OPTIONS':
        return true;
      case 'POST':
        return false;
      default:
        return false;
    }
  }

  /**
   * Returns standard recommended success HTTP status code for a given method
   */
  static getStandardSuccessStatus(method: RestHttpMethod): number {
    switch (method.toUpperCase()) {
      case 'POST':
        return 201; // Created
      case 'DELETE':
        return 204; // No Content
      case 'GET':
      case 'PUT':
      case 'PATCH':
      default:
        return 200; // OK
    }
  }
}
