import { ApiVersionInfo } from './types';

export class ApiVersionNegotiator {
  private defaultVersion: string;
  private deprecatedVersions: Record<string, string>; // version -> sunsetDate (e.g. '1': '2026-12-31')

  constructor(options: {
    defaultVersion?: string;
    deprecatedVersions?: Record<string, string>;
  } = {}) {
    this.defaultVersion = options.defaultVersion || '1';
    this.deprecatedVersions = options.deprecatedVersions || {};
  }

  /**
   * Resolves API version using URL path, Request Headers, or Query Parameters
   */
  resolveVersion(input: Request | { url: string; headers?: Record<string, string> | Headers }): ApiVersionInfo {
    const urlString = typeof input === 'string' ? input : input.url;
    const url = new URL(urlString, 'http://localhost');

    // 1. URL Path Versioning: /api/v1/resource or /api/v2/...
    const pathMatch = url.pathname.match(/\/api\/v(\d+)(?:\/|$)/i);
    if (pathMatch) {
      const ver = pathMatch[1];
      return this.buildVersionInfo(ver, 'URL');
    }

    // 2. Header Versioning: X-API-Version or Accept: application/vnd.api+json; version=1
    let headers: Record<string, string> | Headers | undefined;
    if ('headers' in input && input.headers) {
      headers = input.headers;
    }

    if (headers) {
      const getHeader = (name: string): string | null => {
        if ('get' in headers && typeof headers.get === 'function') {
          return headers.get(name);
        }
        const lower = name.toLowerCase();
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) return String(v);
        }
        return null;
      };

      const xApiVersion = getHeader('x-api-version');
      if (xApiVersion) {
        return this.buildVersionInfo(xApiVersion.trim().replace(/^v/i, ''), 'HEADER');
      }

      const acceptHeader = getHeader('accept');
      if (acceptHeader) {
        const acceptMatch = acceptHeader.match(/version=(\d+)/i);
        if (acceptMatch) {
          return this.buildVersionInfo(acceptMatch[1], 'HEADER');
        }
      }
    }

    // 3. Query Parameter Versioning: ?version=1 or ?v=1
    const queryVersion = url.searchParams.get('version') || url.searchParams.get('v');
    if (queryVersion) {
      return this.buildVersionInfo(queryVersion.trim().replace(/^v/i, ''), 'QUERY_PARAM');
    }

    // Default Fallback
    return this.buildVersionInfo(this.defaultVersion, 'URL');
  }

  /**
   * Applies version and deprecation headers to outgoing API response
   */
  applyVersionHeaders(headers: Headers, info: ApiVersionInfo): void {
    headers.set('X-API-Version', `v${info.version}`);
    if (info.isDeprecated) {
      headers.set('Warning', `299 - "API version ${info.version} is deprecated."`);
      if (info.sunsetDate) {
        headers.set('Sunset', info.sunsetDate);
      }
    }
  }

  private buildVersionInfo(version: string, strategy: 'URL' | 'HEADER' | 'QUERY_PARAM'): ApiVersionInfo {
    const isDeprecated = Object.prototype.hasOwnProperty.call(this.deprecatedVersions, version);
    const sunsetDate = this.deprecatedVersions[version];
    return {
      version,
      strategy,
      isDeprecated,
      sunsetDate,
    };
  }
}
