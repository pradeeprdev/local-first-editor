-- Optional bonus: native Postgres Row Level Security, as an alternative/
-- addition to the Prisma-level scoping in src/lib/authz.ts.
-- Run manually after `prisma migrate dev`:
--   psql $DATABASE_URL -f prisma/rls.sql

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentUpdate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;

-- The API sets `app.current_user_id` per-request via `SET LOCAL` inside a
-- transaction (see src/lib/db.ts -> withUserContext) so Postgres itself
-- enforces tenant isolation, independent of application code bugs.

CREATE POLICY document_tenant_isolation ON "Document"
  USING (
    EXISTS (
      SELECT 1 FROM "Collaborator" c
      WHERE c."documentId" = "Document"."id"
        AND c."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY document_update_tenant_isolation ON "DocumentUpdate"
  USING (
    EXISTS (
      SELECT 1 FROM "Collaborator" c
      WHERE c."documentId" = "DocumentUpdate"."documentId"
        AND c."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY document_version_tenant_isolation ON "DocumentVersion"
  USING (
    EXISTS (
      SELECT 1 FROM "Collaborator" c
      WHERE c."documentId" = "DocumentVersion"."documentId"
        AND c."userId" = current_setting('app.current_user_id', true)
    )
  );
