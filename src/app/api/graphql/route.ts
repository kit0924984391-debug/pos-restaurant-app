/**
 * Next.js App Router Handler for GraphQL API
 * 
 * Provides unified endpoint at /api/graphql.
 * 100% backward compatible with existing REST endpoints.
 */

import { handleGraphQLRequest } from '@/server/graphql';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleGraphQLRequest(request);
}

export async function GET(request: Request) {
  return handleGraphQLRequest(request);
}

export async function OPTIONS(request: Request) {
  return handleGraphQLRequest(request);
}
