-- Enable Row Level Security on all tenant-isolated tables
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Context" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboxItem" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Task table
CREATE POLICY "tenant_isolation_tasks" ON "Task"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_tasks_insert" ON "Task"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create RLS policies for Project table
CREATE POLICY "tenant_isolation_projects" ON "Project"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_projects_insert" ON "Project"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create RLS policies for Context table
CREATE POLICY "tenant_isolation_contexts" ON "Context"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_contexts_insert" ON "Context"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create RLS policies for Area table
CREATE POLICY "tenant_isolation_areas" ON "Area"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_areas_insert" ON "Area"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create RLS policies for InboxItem table
CREATE POLICY "tenant_isolation_inbox_items" ON "InboxItem"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_inbox_items_insert" ON "InboxItem"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Task_tenantId_priority_idx" ON "Task"("tenantId", "priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Task_tenantId_completedAt_idx" ON "Task"("tenantId", "completedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Project_tenantId_areaId_idx" ON "Project"("tenantId", "areaId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Context_tenantId_name_idx" ON "Context"("tenantId", "name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Area_tenantId_name_idx" ON "Area"("tenantId", "name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "InboxItem_tenantId_createdAt_idx" ON "InboxItem"("tenantId", "createdAt");

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql;