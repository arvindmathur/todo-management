import { prisma } from './prisma';

/**
 * Set the tenant context for row-level security
 * This should be called before any database operations to ensure proper tenant isolation
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_tenant_context(${tenantId})`;
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
    await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', '', true)`;
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(name: string): Promise<{ id: string; name: string }> {
  return await prisma.tenant.create({
    data: {
      name,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get tenant by ID
 */
export async function getTenant(id: string): Promise<{ id: string; name: string } | null> {
  return await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });
}