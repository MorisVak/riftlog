-- A default deck: the one the match setup sheet pre-selects.
--
-- Stored on the profile (one per account, follows you across devices) rather
-- than on the device. Optional; null = start with "No deck".
--
-- Ownership is enforced by the key itself, like matches.deck_version_id: the
-- composite FK (default_deck_id, id) → decks (id, owner_id) means a profile
-- can only point at a deck its own user owns.
--
-- Deleting a deck is a soft delete (archived_at), which this FK doesn't see;
-- delete_deck / delete_decks are redefined below to clear the default when
-- they archive it, so a deleted deck never stays the default. The FK's
-- ON DELETE SET NULL (default_deck_id) only covers a real row delete (account
-- deletion cascades), and nulls just that column, never the profile's id.

alter table public.profiles add column default_deck_id uuid;

alter table public.profiles
  add constraint profiles_default_deck_fkey
  foreign key (default_deck_id, id)
  references public.decks (id, owner_id)
  on delete set null (default_deck_id);

-- The owner sets it with a plain update; the FK refuses anyone else's deck.
grant update (default_deck_id) on public.profiles to authenticated;

-- ============================================================================
-- delete_deck / delete_decks: same as before (see 20261007131426 and
-- 20261007132243), plus clearing the caller's default if it was archived.
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

  update public.profiles
    set default_deck_id = null
    where id = uid and default_deck_id = p_deck_id;
end;
$$;

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

  update public.profiles
    set default_deck_id = null
    where id = uid and default_deck_id = any(p_deck_ids);

  return n;
end;
$$;

-- create or replace keeps existing privileges; restated for clarity.
revoke all on function public.delete_deck(uuid) from public, anon;
grant execute on function public.delete_deck(uuid) to authenticated;
revoke all on function public.delete_decks(uuid[]) from public, anon;
grant execute on function public.delete_decks(uuid[]) to authenticated;
