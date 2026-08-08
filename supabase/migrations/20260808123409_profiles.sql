-- profiles: one row per account, seeded automatically on first sign-in.
--
-- Two distinct name columns, deliberately:
--   display_name — cosmetic, NOT unique, whatever the provider gave us.
--   username     — the unique @handle in OUR namespace, auto-assigned here.
--
-- Handles are assigned, never claimed: there is no username step at signup
-- (a signup wall is exactly what mandatory login is already costing us). Users
-- rename later from the profile screen.
--
-- Seeding is a Postgres trigger on auth.users, NOT client code. Client-side
-- seeding races the OAuth redirect and silently misses every user who bounces
-- mid-flow; a trigger fires inside the same transaction that creates the user.

-- ============================================================================
-- profiles
-- ============================================================================
create table public.profiles (
  -- Not just an FK — the PK IS the auth user id, so a profile can't exist
  -- without its user and dies with it.
  id uuid primary key references auth.users (id) on delete cascade,
  -- Handles are generated lowercase; the check keeps a future rename UI from
  -- introducing spaces, dots, or unicode lookalikes.
  username text not null check (username ~ '^[a-z0-9_]{2,30}$'),
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness without the citext extension: "Maurice" and
-- "maurice" are the same handle. This index is also the arbiter that makes
-- handle generation collision-safe under concurrency (see below).
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- ============================================================================
-- Row Level Security: a user reads/writes only their own row.
--
-- No INSERT policy and no DELETE policy, on purpose: rows are created solely by
-- the security-definer trigger below and removed solely by the cascade from
-- auth.users. The client can never mint or drop a profile.
-- ============================================================================
alter table public.profiles enable row level security;

create policy "profiles: owner can select" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: owner can update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- updated_at
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Seed a profile on first sign-in
--
-- security definer so it can write to a table whose RLS has no insert policy;
-- search_path = '' so nothing here can be hijacked by a caller-controlled path
-- (every reference below is schema-qualified or a pg_catalog builtin).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  seed_name text;
  seed_avatar text;
  base text;
  candidate text;
  attempt int := 0;
begin
  -- Idempotence guard. Without it a pre-existing row would collide on the
  -- PRIMARY KEY inside the retry loop below, which only knows how to resolve
  -- username collisions, and would burn all 40 attempts on the same id.
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- Provider metadata keys vary and change; probe several rather than betting on
  -- one mapping. Discord surfaces global_name (sometimes under custom_claims),
  -- Google sends full_name/name/picture, Apple frequently sends NOTHING —
  -- never assume a name is there.
  seed_name := coalesce(
    nullif(meta ->> 'global_name', ''),
    nullif(meta -> 'custom_claims' ->> 'global_name', ''),
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(meta ->> 'preferred_username', ''),
    nullif(meta ->> 'user_name', ''),
    nullif(split_part(coalesce(new.email, meta ->> 'email', ''), '@', 1), ''),
    'Player'
  );

  seed_avatar := nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture', ''), '');

  -- Slugify into our namespace: lowercase, alphanumerics only, capped so a long
  -- name plus a collision suffix still fits the column check.
  base := left(lower(regexp_replace(seed_name, '[^a-zA-Z0-9]+', '', 'g')), 20);
  if length(base) < 2 then
    base := 'player';
  end if;

  -- Collision-safety is the INSERT itself, not a pre-flight SELECT. Probing for
  -- a free handle and then inserting is racy — two concurrent signups named
  -- "maurice" both see it free. Here the unique index decides, and we retry:
  --   maurice -> maurice1 -> maurice2 -> ... -> player_a4f2c1
  loop
    attempt := attempt + 1;
    candidate := case
      when attempt = 1 then base
      when attempt <= 20 then base || (attempt - 1)::text
      -- Popular name, or something pathological. Stop counting and take a
      -- random token; md5 avoids a pgcrypto dependency.
      else 'player_' || substr(md5(random()::text || new.id::text), 1, 6)
    end;

    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (new.id, candidate, seed_name, seed_avatar);
      return new;
    exception
      when unique_violation then
        -- Handle taken between our attempt and the commit. Try the next one.
        if attempt >= 40 then
          raise;
        end if;
    end;
  end loop;

exception
  -- A raising trigger ABORTS the signup. No metadata edge case is worth locking
  -- someone out of creating an account: log it and let the user through with no
  -- profile row rather than failing the insert into auth.users.
  when others then
    raise warning 'handle_new_user failed for %: % (%)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
