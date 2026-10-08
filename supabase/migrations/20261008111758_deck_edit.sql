-- Editing a deck's list = a NEW immutable version.
--
-- As designed in 20260924155255_decks.sql: versions are never updated, so an
-- edit inserts a deck_versions row and moves decks.current_version_id to it.
-- Anything that pinned the old version (match history via
-- matches.deck_version_id) keeps seeing exactly the list that was played.
--
-- Clients still have no write to deck_versions or current_version_id; this
-- RPC is the one way in. decks.updated_at moves with it (trigger), so an
-- edited deck rises to the top of "My decks".

-- ============================================================================
-- update_deck_list: give one of the caller's live decks a new current list.
-- Returns the current version id afterwards. Saving a list identical to the
-- current one adds nothing and returns the existing version (so a retried
-- save can't stack duplicate versions). Raises 'not_found' (P0002) for a deck
-- that doesn't exist, isn't the caller's, or was deleted; 'invalid_list'
-- (22023) for something that isn't a DeckList.
-- ============================================================================
create or replace function public.update_deck_list(p_deck_id uuid, p_list jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
  cur_version uuid;
  cur_list jsonb;
  new_version uuid;
begin
  if p_list is null or not public.is_deck_list(p_list) then
    raise exception 'invalid_list' using errcode = '22023';
  end if;

  -- Lock the deck row so two concurrent edits serialize.
  select d.current_version_id into cur_version
    from public.decks d
    where d.id = p_deck_id and d.owner_id = uid and d.archived_at is null
    for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select v.list into cur_list from public.deck_versions v where v.id = cur_version;
  if cur_list = p_list then
    return cur_version;
  end if;

  insert into public.deck_versions (deck_id, owner_id, list)
  values (p_deck_id, uid, p_list)
  returning id into new_version;

  update public.decks set current_version_id = new_version where id = p_deck_id;

  return new_version;
end;
$$;

revoke all on function public.update_deck_list(uuid, jsonb) from public, anon;
grant execute on function public.update_deck_list(uuid, jsonb) to authenticated;
