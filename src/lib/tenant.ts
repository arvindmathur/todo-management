import { prisma } from './prisma';
import { DatabaseConnection } from './db-connection';

/**
 * Set the tenant context for row-level security
 * This should be called before any database operations to ensure proper tenant isolation
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  await DatabaseConnection.withRetry(
    () => prisma.$executeRaw`SELECT set_tenant_context(${tenantId})`,
    'set-tenant-context'
  );
}

/**
 * Execute a function within a tenant context
 * Automatically sets and clears the tenant context
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  await setTenantContext(tenantId);
  try {
    return await fn();
  } finally {
    // Clear the tenant context after operation
    await DatabaseConnection.withRetry(
      () => prisma.$executeRaw`SELECT set_config('app.current_tenant_id', '', true)`,
      'clear-tenant-context'
    );
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(name: string): Promise<{ id: string; name: string }> {
  return await DatabaseConnection.withRetry(
    () => prisma.tenant.create({
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    'create-tenant'
  );
}

/**
 * Get tenant by ID
 */
export async function getTenant(id: string): Promise<{ id: string; name: string } | null> {
  return await DatabaseConnection.withRetry(
    () => prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    }),
    'get-tenant'
  );
}