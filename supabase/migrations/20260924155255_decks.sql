-- decks: a player's saved decks, and the immutable versions of their lists.
--
--   decks          — the thing a player owns and names. Mutable only in its
--                    name (and, later, which version is current).
--   deck_versions  — one frozen DeckList (jsonb, the @riftlog/core type) per
--                    row. Never updated, never deleted by a client. Editing a
--                    deck will add a version and move decks.current_version_id
--                    (SPEC Feature 5), so anything that pins a version — match
--                    history, per-deck stats, an opponent's view of a shared
--                    match — keeps seeing exactly the list that was played.
--
-- Designed for, NOT built here: attaching versions to matches, a favorite deck
-- (profiles.favorite_deck_id), per-deck stats, and letting a match-mode
-- opponent read the single version used in a shared match. The last one is an
-- extra SELECT policy on deck_versions; versions carry their own id and owner
-- so that policy can target one row without restructuring anything.
--
-- No delete path yet. When one lands it should be a SOFT delete (an
-- archived_at column): once matches pin versions, hard-deleting a deck would
-- cascade away history.
--
-- Card catalog (future): a `cards` table keyed by the full printing code
-- (e.g. SFD-149a) with name / type / domains / art, filled server-side once
-- the Riot API key exists. Lists keep CardRef.code; text imports have
-- code = null and resolve art by normalized name at read time, so no stored
-- list ever needs migrating to gain art.

-- ============================================================================
-- DeckList shape check (the jsonb mirrors @riftlog/core's DeckList). Shallow
-- on purpose: the client parser owns card-level validation; the database only
-- refuses things that aren't a DeckList at all.
-- ============================================================================
create or replace function public.is_deck_list(p_list jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_list) = 'object'
    and p_list ?& array['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard', 'additionalLegends']
    and jsonb_typeof(p_list -> 'legend') in ('object', 'null')
    and jsonb_typeof(p_list -> 'champion') in ('object', 'null')
    and jsonb_typeof(p_list -> 'main') = 'array'
    and jsonb_typeof(p_list -> 'battlefields') = 'array'
    and jsonb_typeof(p_list -> 'runes') = 'array'
    and jsonb_typeof(p_list -> 'sideboard') = 'array'
    and jsonb_typeof(p_list -> 'additionalLegends') = 'array';
$$;

-- ============================================================================
-- decks
-- ============================================================================
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 60),
  import_source text not null
    check (import_source in ('text', 'piltover_code', 'manual')),
  -- The original code for piltover_code imports; nothing else carries one.
  source_code text
    check (source_code is null or (import_source = 'piltover_code' and char_length(source_code) <= 4096)),
  -- Null only for the instant inside create_deck between the two inserts.
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for deck_versions' (deck_id, owner_id) FK below.
  unique (id, owner_id)
);

create index decks_owner_updated_idx on public.decks (owner_id, updated_at desc);

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- ============================================================================
-- deck_versions
-- ============================================================================
create table public.deck_versions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null,
  -- Denormalized from decks (like games.user_id) so RLS is a direct column
  -- check, and a future shared-match policy can grant one version by id. The
  -- composite FK keeps it equal to the deck's owner.
  owner_id uuid not null,
  list jsonb not null
    check (public.is_deck_list(list) and octet_length(list::text) <= 65536),
  created_at timestamptz not null default now(),
  foreign key (deck_id, owner_id) references public.decks (id, owner_id) on delete cascade,
  -- Target for decks.current_version_id's composite FK below.
  unique (deck_id, id)
);

create index deck_versions_deck_idx on public.deck_versions (deck_id, created_at desc);

-- A deck's current version must be one of ITS versions, not any version.
alter table public.decks
  add constraint decks_current_version_fkey
  foreign key (id, current_version_id) references public.deck_versions (deck_id, id);

-- ============================================================================
-- Row Level Security + privileges: owner-only reads; the only direct client
-- write is renaming a deck. Creation goes through create_deck() so a deck can
-- never exist without a version; versions are immutable.
-- ============================================================================
alter table public.decks enable row level security;
alter table public.deck_versions enable row level security;

create policy "decks: owner can select" on public.decks
  for select to authenticated using (owner_id = auth.uid());
create policy "decks: owner can update" on public.decks
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "deck_versions: owner can select" on public.deck_versions
  for select to authenticated using (owner_id = auth.uid());

revoke all on public.decks from anon, authenticated;
revoke all on public.deck_versions from anon, authenticated;
grant select on public.decks to authenticated;
grant update (name) on public.decks to authenticated;
grant select on public.deck_versions to authenticated;

-- ============================================================================
-- create_deck: the deck and its first version, atomically. Returns the deck
-- id. Invalid input raises (errcode 22023) with a short code as the message —
-- the client validates first, so reaching one is a bug, not a user error.
-- ============================================================================
create or replace function public.create_deck(
  p_name text,
  p_import_source text,
  p_source_code text,
  p_list jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
  deck_name text := btrim(coalesce(p_name, ''));
  new_deck uuid;
  new_version uuid;
begin
  if char_length(deck_name) not between 1 and 60 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if p_import_source is null or p_import_source not in ('text', 'piltover_code', 'manual') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;
  if p_list is null or not public.is_deck_list(p_list) then
    raise exception 'invalid_list' using errcode = '22023';
  end if;

  insert into public.decks (owner_id, name, import_source, source_code)
  values (uid, deck_name, p_import_source, nullif(btrim(p_source_code), ''))
  returning id into new_deck;

  insert into public.deck_versions (deck_id, owner_id, list)
  values (new_deck, uid, p_list)
  returning id into new_version;

  update public.decks set current_version_id = new_version where id = new_deck;

  return new_deck;
end;
$$;

revoke all on function public.is_deck_list(jsonb) from public, anon, authenticated;
revoke all on function public.create_deck(text, text, text, jsonb) from public, anon;
grant execute on function public.create_deck(text, text, text, jsonb) to authenticated;
