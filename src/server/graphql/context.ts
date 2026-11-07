/**
 * GraphQL Implementation - Context Factory
 */

import { SessionUser, getCurrentUser } from '@/lib/auth';
import { createDataLoaders, GraphQLDataLoaders } from './dataloaders';

export interface GraphQLContext {
  request: Request;
  user: SessionUser | null;
  loaders: GraphQLDataLoaders;
}

export async function createGraphQLContext(request: Request): Promise<GraphQLContext> {
  const user = await getCurrentUser(request);
  const loaders = createDataLoaders();

  return {
    request,
    user,
    loaders,
  };
}
