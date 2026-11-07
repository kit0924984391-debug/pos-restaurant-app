/**
 * GraphQL Implementation - Executable Schema & Request Handler
 * 
 * Works across Web Standards runtimes (Cloudflare Workers, Next.js, Node.js).
 */

import { buildSchema, graphql, GraphQLSchema } from 'graphql';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { createGraphQLContext } from './context';

// In standard graphql package, we can combine typeDefs and resolvers cleanly
// using buildSchema with rootValue resolver dispatch or AST schema building.

// Schema builder with type-resolver binding
let cachedSchema: GraphQLSchema | null = null;

export function getGraphQLSchema(): GraphQLSchema {
  if (cachedSchema) return cachedSchema;

  // Build standard GraphQL schema from SDL
  cachedSchema = buildSchema(typeDefs);
  return cachedSchema;
}

export interface GraphQLRequestBody {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

/**
 * Handles incoming GraphQL requests over HTTP Web Standards
 */
export async function handleGraphQLRequest(request: Request): Promise<Response> {
  // CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    let query = '';
    let variables: Record<string, any> | undefined;
    let operationName: string | undefined;

    if (request.method === 'POST') {
      const body = (await request.json()) as GraphQLRequestBody;
      query = body.query || '';
      variables = body.variables;
      operationName = body.operationName;
    } else if (request.method === 'GET') {
      const url = new URL(request.url);
      query = url.searchParams.get('query') || '';
      const varStr = url.searchParams.get('variables');
      if (varStr) {
        try {
          variables = JSON.parse(varStr);
        } catch {}
      }
      operationName = url.searchParams.get('operationName') || undefined;
    } else {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!query.trim()) {
      return new Response(
        JSON.stringify({
          errors: [{ message: 'ต้องระบุ GraphQL Query ใน Request' }],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const schema = getGraphQLSchema();
    const contextValue = await createGraphQLContext(request);

    // Combine Query and Mutation resolvers into rootValue for buildSchema execution
    const rootValue: Record<string, any> = {};
    for (const [key, fn] of Object.entries(resolvers.Query)) {
      rootValue[key] = (args: any, context: any, info: any) => (fn as any)(null, args, context, info);
    }
    for (const [key, fn] of Object.entries(resolvers.Mutation)) {
      rootValue[key] = (args: any, context: any, info: any) => (fn as any)(null, args, context, info);
    }

    const result = await graphql({
      schema,
      source: query,
      rootValue,
      contextValue,
      variableValues: variables,
      operationName,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[GraphQL Execution Error]', err);
    return new Response(
      JSON.stringify({
        errors: [{ message: err.message || 'Internal GraphQL execution error' }],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
