-- delete_decks: (soft-)delete several of the caller's decks in one round trip,
-- for multi-select in "My decks". Same semantics as delete_deck
-- (20261007131426_deck_soft_delete.sql): stamps archived_at, keeps versions.
--
-- Ids that don't exist or aren't the caller's are simply not touched — the
-- return value is how many decks were actually archived (already-archived ones
-- count, so retrying a delete is idempotent). Capped at 200 ids per call.

create or replace function public.delete_decks(p_deck_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
  n integer;
begin
  if p_deck_ids is null or cardinality(p_deck_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_deck_ids) > 200 then
    raise exception 'too_many' using errcode = '22023';
  end if;

  update public.decks
    set archived_at = coalesce(archived_at, now())
    where id = any(p_deck_ids) and owner_id = uid;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.delete_decks(uuid[]) from public, anon;
grant execute on function public.delete_decks(uuid[]) to authenticated;
