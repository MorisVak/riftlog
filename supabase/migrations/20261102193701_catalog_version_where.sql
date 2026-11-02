-- catalog version bump: add a WHERE clause.
--
-- Supabase loads pg-safeupdate for API (PostgREST) sessions, which refuses
-- any UPDATE without a WHERE clause. bump_catalog_version() updated the one
-- catalog_meta row without one, so the first catalog write through the API
-- (the importer's, or an admin's from the app) failed inside the trigger:
-- "UPDATE requires a WHERE clause". The SQL editor doesn't load safeupdate,
-- which is why dashboard edits weren't affected.
--
-- `create or replace` keeps the function's owner and privileges (EXECUTE
-- stays revoked from every client role), so no grants are repeated here.
create or replace function public.bump_catalog_version()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.catalog_meta set version = version + 1, updated_at = now()
  where id;
$$;
