import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { setTenantContext } from './tenant';

/**
 * Middleware to ensure tenant context is set for API requests
 * This should be called at the beginning of protected API routes
 */
export async function withTenantMiddleware(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.tenantId) {
    throw new Error('No tenant context available');
  }

  // Set the tenant context for this request
  await setTenantContext(session.user.tenantId);
  
  return {
    session,
    tenantId: session.user.tenantId,
    userId: session.user.id,
  };
}

/**
 * Higher-order function to wrap API handlers with tenant context
 */
export function withTenant<T extends any[]>(
  handler: (context: { session: any; tenantId: string; userId: string }, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const context = await withTenantMiddleware(request);
      return await handler(context, ...args);
    } catch (error) {
      console.error('Tenant middleware error:', error);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}