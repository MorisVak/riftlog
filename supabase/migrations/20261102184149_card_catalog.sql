-- card catalog: every Riftbound card and printing, owned by us.
--
--   sets              — one row per set (OGN, SFD, …). deck_code_set_id is the
--                       numeric id deck codes use; null = not deckable (the
--                       promo sets OPP / PR / JDG).
--   cards             — gameplay identity: one row per card however many
--                       printings it has. current_text is the text of its
--                       base printing (main set, then OGS, then promos).
--   card_printings    — the physical printings, keyed by the deck-code printing
--                       code (SET-NNN[variant], e.g. SFD-149a, VEN-R01, UNL-229*).
--                       This code is what CardRef.code in a deck holds.
--   card_errata       — wording changes to a card over time. Empty for now;
--                       nothing writes it yet.
--   catalog_overrides — corrections to the import source, applied by the
--                       importer on every run (keyed by the source's own id).
--   catalog_meta      — one row; version bumps on any real catalog change so
--                       the app refetches only when something changed.
--   catalog_admins    — who may write the catalog. Same shape as
--                       feedback_admins; separate on purpose.
--
-- Postgres is the source of truth. The importer (scripts, secret key) seeds
-- and syncs it from Riftcodex today and from Riot later (source = 'riot');
-- clients only read it, with the publishable key. Rows marked
-- manually_edited are never overwritten by an import.
--
-- Supersedes the "Card catalog (future)" sketch in 20260924155255_decks.sql:
-- the single `cards` table keyed by printing code is split into cards
-- (gameplay) + card_printings (keyed by that code). Decks are unchanged —
-- CardRef.code joins card_printings.code, and name-only cards resolve by
-- cards.name_key at read time. No deck data is migrated.

-- ============================================================================
-- Enums
-- ============================================================================
create type public.catalog_source as enum ('riftcodex', 'manual', 'riot');
create type public.catalog_status as enum ('spoiler', 'released');
create type public.card_type as enum
  ('Legend', 'Unit', 'Spell', 'Gear', 'Battlefield', 'Rune');

-- ============================================================================
-- Admins
-- ============================================================================

-- Who may write the catalog. Keyed by account id, never by handle. RLS on, no
-- policies, no grants: only is_catalog_admin() reads it. Rows are added by
-- hand in the SQL editor.
create table public.catalog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.catalog_admins enable row level security;
revoke all on public.catalog_admins from public, anon, authenticated;

-- Is the caller a catalog admin? Called from RLS policies, so it runs as the
-- signed-in user and they need EXECUTE; it only ever answers for themselves.
create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.catalog_admins where user_id = (select auth.uid())
  );
$$;

-- ============================================================================
-- Tables
-- ============================================================================

-- Every catalog table carries source / manually_edited / status / timestamps.

create table public.sets (
  code text primary key check (code ~ '^[A-Z]{2,4}$'),
  name text not null check (name = btrim(name) and name <> ''),
  released_on date,
  deck_code_set_id smallint unique check (deck_code_set_id >= 0),
  source public.catalog_source not null default 'manual',
  manually_edited boolean not null default false,
  status public.catalog_status not null default 'released',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and name <> ''),
  -- The normalized match key, written by the importer with @riftlog/core's
  -- normalizer (the same one the app uses), so the two can't disagree.
  name_key text not null unique check (name_key <> ''),
  type public.card_type not null,
  supertype text,
  domains text[] not null default '{}' check (
    domains <@ array['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order', 'Colorless']
  ),
  energy smallint check (energy >= 0),
  might smallint check (might >= 0),
  power smallint check (power >= 0),
  tags text[] not null default '{}',
  current_text text not null default '',
  source public.catalog_source not null default 'manual',
  manually_edited boolean not null default false,
  status public.catalog_status not null default 'released',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.card_printings (
  code text primary key
    check (code ~ '^[A-Z]{2,4}-(R|SP)?[0-9]{1,3}[a-z*]?$'),
  card_id uuid not null references public.cards (id) on delete restrict,
  set_code text not null references public.sets (code),
  collector_number text not null check (collector_number ~ '^(R|SP)?[0-9]{1,3}$'),
  -- '' = base, a / b = alternate printings, * = signed, m = Metal (promo only).
  variant text not null default '' check (variant ~ '^[a-z*]?$'),
  alt_art boolean not null default false,
  overnumbered boolean not null default false,
  signed boolean not null default false,
  promo boolean not null default false,
  -- The text as printed on this printing (alt arts often drop reminder text).
  printed_text text not null default '',
  -- Where the art comes from: storage_path (our bucket) wins over image_url.
  image_url text check (image_url ~ '^https://'),
  storage_path text check (storage_path <> ''),
  artist text,
  rarity text,
  orientation text not null default 'portrait'
    check (orientation in ('portrait', 'landscape')),
  -- The import source's own id (unique there; riftbound_id is not).
  riftcodex_id text unique,
  source public.catalog_source not null default 'manual',
  manually_edited boolean not null default false,
  status public.catalog_status not null default 'released',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The code is exactly its parts, so it can't drift from them.
  check (code = set_code || '-' || collector_number || variant)
);
create index card_printings_card_idx on public.card_printings (card_id);
create index card_printings_set_idx on public.card_printings (set_code);

create table public.card_errata (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  previous_text text not null,
  new_text text not null,
  effective_on date,
  source_note text,
  source public.catalog_source not null default 'manual',
  manually_edited boolean not null default false,
  status public.catalog_status not null default 'released',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index card_errata_card_idx on public.card_errata (card_id);

-- Corrections to the import source, re-applied on every import so source
-- updates keep flowing for everything else. `field` names what to replace;
-- `skip` drops the entry. Config, not catalog content, so no source/status.
create table public.catalog_overrides (
  id uuid primary key default gen_random_uuid(),
  riftcodex_id text not null,
  field text not null check (field in (
    'code', 'name', 'type', 'supertype', 'domains', 'text', 'image_url',
    'orientation', 'status', 'skip'
  )),
  value jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (riftcodex_id, field)
);

-- One row. The app caches the catalog with this version and refetches only
-- when it moves.
create table public.catalog_meta (
  id boolean primary key default true check (id),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.catalog_meta (id) values (true);

-- ============================================================================
-- updated_at — only when a row really changed, so a no-op update leaves the
-- row identical and doesn't bump the catalog version.
-- ============================================================================
create or replace function public.catalog_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.*) is distinct from row(old.*) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ============================================================================
-- catalog_meta.version — bumped once per statement that changed rows.
-- Postgres allows transition tables only on single-event triggers, hence one
-- function per event.
-- ============================================================================
create or replace function public.bump_catalog_version()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.catalog_meta set version = version + 1, updated_at = now();
$$;

create or replace function public.catalog_bump_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from new_rows) then
    perform public.bump_catalog_version();
  end if;
  return null;
end;
$$;

create or replace function public.catalog_bump_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select * from new_rows except select * from old_rows) then
    perform public.bump_catalog_version();
  end if;
  return null;
end;
$$;

create or replace function public.catalog_bump_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from old_rows) then
    perform public.bump_catalog_version();
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['sets', 'cards', 'card_printings', 'card_errata'] loop
    execute format(
      'create trigger %1$s_set_updated_at before update on public.%1$I
         for each row execute function public.catalog_set_updated_at()', t);
    execute format(
      'create trigger %1$s_bump_insert after insert on public.%1$I
         referencing new table as new_rows
         for each statement execute function public.catalog_bump_on_insert()', t);
    execute format(
      'create trigger %1$s_bump_update after update on public.%1$I
         referencing old table as old_rows new table as new_rows
         for each statement execute function public.catalog_bump_on_update()', t);
    execute format(
      'create trigger %1$s_bump_delete after delete on public.%1$I
         referencing old table as old_rows
         for each statement execute function public.catalog_bump_on_delete()', t);
  end loop;
end;
$$;

create trigger catalog_overrides_set_updated_at
  before update on public.catalog_overrides
  for each row execute function public.catalog_set_updated_at();

-- ============================================================================
-- Row Level Security
--
-- Catalog content is public: anyone (signed in or not) may read it. Writes
-- are admin-only. Overrides are internal, so admins only, read included.
-- The importer uses the secret key, which bypasses RLS.
-- ============================================================================
alter table public.sets enable row level security;
alter table public.cards enable row level security;
alter table public.card_printings enable row level security;
alter table public.card_errata enable row level security;
alter table public.catalog_overrides enable row level security;
alter table public.catalog_meta enable row level security;

revoke all on public.sets, public.cards, public.card_printings,
  public.card_errata, public.catalog_overrides, public.catalog_meta
  from public, anon, authenticated;

grant select on public.sets, public.cards, public.card_printings,
  public.card_errata, public.catalog_meta
  to anon, authenticated;
grant insert, update, delete on public.sets, public.cards,
  public.card_printings, public.card_errata
  to authenticated;
grant select, insert, update, delete on public.catalog_overrides
  to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['sets', 'cards', 'card_printings', 'card_errata'] loop
    execute format(
      'create policy "%1$s: anyone can read" on public.%1$I
         for select to anon, authenticated using (true)', t);
  end loop;
  foreach t in array
    array['sets', 'cards', 'card_printings', 'card_errata', 'catalog_overrides'] loop
    execute format(
      'create policy "%1$s: admins can insert" on public.%1$I
         for insert to authenticated with check (public.is_catalog_admin())', t);
    execute format(
      'create policy "%1$s: admins can update" on public.%1$I
         for update to authenticated
         using (public.is_catalog_admin()) with check (public.is_catalog_admin())', t);
    execute format(
      'create policy "%1$s: admins can delete" on public.%1$I
         for delete to authenticated using (public.is_catalog_admin())', t);
  end loop;
end;
$$;

create policy "catalog_overrides: admins can read" on public.catalog_overrides
  for select to authenticated using (public.is_catalog_admin());

-- Written only by the bump trigger (security definer).
create policy "catalog_meta: anyone can read" on public.catalog_meta
  for select to anon, authenticated using (true);

-- ============================================================================
-- Function privileges (Supabase grants EXECUTE to anon and authenticated
-- explicitly, so revoke from all three and grant back only what's needed).
-- ============================================================================
revoke all on function public.is_catalog_admin() from public, anon, authenticated;
revoke all on function public.bump_catalog_version() from public, anon, authenticated;
revoke all on function public.catalog_bump_on_insert() from public, anon, authenticated;
revoke all on function public.catalog_bump_on_update() from public, anon, authenticated;
revoke all on function public.catalog_bump_on_delete() from public, anon, authenticated;
revoke all on function public.catalog_set_updated_at() from public, anon, authenticated;
-- The write policies call it as the signed-in user.
grant execute on function public.is_catalog_admin() to authenticated;

-- ============================================================================
-- Storage: card-images, for art we upload ourselves. Public read through the
-- bucket's public URL (no select policy needed for that); writes admin-only.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "card-images: admins can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'card-images' and public.is_catalog_admin());
create policy "card-images: admins can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'card-images' and public.is_catalog_admin());
create policy "card-images: admins can update" on storage.objects
  for update to authenticated
  using (bucket_id = 'card-images' and public.is_catalog_admin())
  with check (bucket_id = 'card-images' and public.is_catalog_admin());
create policy "card-images: admins can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'card-images' and public.is_catalog_admin());
