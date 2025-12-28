# Database Setup Instructions

## Overview
This document outlines the database schema setup for the multi-tenant todo management application.

## Schema Changes Made

### 1. Added Tenant Table
- Created explicit `Tenant` table for proper multi-tenant architecture
- Each tenant has a unique ID and name
- Tracks creation and update timestamps

### 2. Updated User Model
- Removed default `tenantId` generation
- Added proper foreign key relationship to `Tenant` table
- Added index on `tenantId` for performance

### 3. Enhanced All Models with Tenant Relations
- Added `tenant` relation to all tenant-scoped models (Task, Project, Context, Area, InboxItem)
- Added comprehensive indexes for multi-tenant queries
- Optimized indexes for common query patterns

### 4. Performance Indexes Added
- `tenantId` + `userId` composite indexes on all models
- `tenantId` + `status` for filtering
- `tenantId` + `dueDate` for date-based queries
- `tenantId` + `processed` for inbox management

## Required Database Commands

To apply these changes, run the following commands:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Apply row-level security policies
psql $DATABASE_URL -f prisma/migrations/001_add_row_level_security.sql
```

## Row-Level Security (RLS)

The application implements row-level security to ensure complete tenant isolation:

1. **Enabled RLS** on all tenant-scoped tables
2. **Created policies** that filter by `app.current_tenant_id` setting
3. **Added helper function** `set_tenant_context()` to set tenant context
4. **Created utility functions** in `src/lib/tenant.ts` for tenant management

## Application Integration

### Tenant Context Management
- `src/lib/tenant.ts` - Utility functions for tenant operations
- `src/lib/api-middleware.ts` - Middleware to set tenant context in API routes
- Updated `src/app/api/auth/register/route.ts` to create tenant during user registration

### Usage in API Routes
```typescript
import { withTenant } from '@/lib/api-middleware';

export const GET = withTenant(async ({ session, tenantId, userId }) => {
  // Your API logic here - tenant context is automatically set
  const tasks = await prisma.task.findMany({
    where: { userId } // RLS automatically filters by tenantId
  });
  return Response.json(tasks);
});
```

## Security Features

1. **Complete Data Isolation**: Each tenant's data is completely isolated
2. **Automatic Filtering**: RLS policies automatically filter queries by tenant
3. **Audit Logging**: All operations are logged with tenant context
4. **Performance Optimized**: Indexes designed for multi-tenant query patterns

## Requirements Satisfied

This implementation satisfies the following requirements:
- **9.1**: Complete data isolation between users/tenants
- **9.3**: Tenant-level security enforcement
- **9.5**: Support for unlimited independent user accounts