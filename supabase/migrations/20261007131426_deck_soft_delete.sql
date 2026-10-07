-- Deleting a deck is a SOFT delete.
--
-- Deck versions are what match history, per-deck stats, and a match-mode
-- opponent's view will pin (see 20260924155255_decks.sql). A hard delete would
-- cascade those versions away and leave history pointing at nothing, so
-- "delete" instead stamps archived_at: the deck disappears from the player's
-- lists, and its versions stay readable by whatever references them.
--
-- Clients get no direct write to archived_at (still only UPDATE (name)); the
-- RPC below is the one way in. There's deliberately no "restore" yet.
-- Deleting the account still removes everything (auth.users cascade).

alter table public.decks add column archived_at timestamptz;

-- "My decks" reads only live decks, newest first.
drop index if exists public.decks_owner_updated_idx;
create index decks_owner_live_updated_idx
  on public.decks (owner_id, updated_at desc)
  where archived_at is null;

-- ============================================================================
-- delete_deck: archive one of the caller's own decks. Idempotent — deleting an
-- already-deleted deck is a no-op. Raises 'not_found' (P0002) for a deck that
-- doesn't exist or isn't the caller's, so the client can't probe other ids.
-- ============================================================================
create or replace function public.delete_deck(p_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
begin
  update public.decks
    set archived_at = coalesce(archived_at, now())
    where id = p_deck_id and owner_id = uid;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_deck(uuid) from public, anon;
grant execute on function public.delete_deck(uuid) to authenticated;
