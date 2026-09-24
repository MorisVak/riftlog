-- profile identity: claimed handles, onboarding, reserved names.
--
-- Supersedes the "handles are assigned, never claimed" model of
-- 20260808123409_profiles.sql. From here on:
--
--   profiles.id  — the ONLY identity reference other tables may hold. Never
--                  copy handle text onto another record; join for it.
--   username     — the @handle. Seeded neutral (player_<hex>), CLAIMED by the
--                  user at onboarding, renameable once per 30 days. Clients
--                  can't write it with a plain UPDATE — only via the RPCs below.
--   display_name — cosmetic, not unique, 1–32 chars trimmed. The one column the
--                  owner may still UPDATE directly.
--   onboarded_at — null until onboarding completes; set only by
--                  complete_onboarding().
--
-- Seeded handles are deliberately never derived from a name or email: the
-- email local-part often IS a real name. Provider names are only suggestions,
-- offered client-side at onboarding.

-- ============================================================================
-- New columns
-- ============================================================================
alter table public.profiles
  -- Null until the first post-onboarding rename. The onboarding claim does
  -- not stamp it, so it doesn't count toward the 30-day limit.
  add column username_changed_at timestamptz,
  -- Existing accounts stay null and therefore go through onboarding.
  add column onboarded_at timestamptz;

-- ============================================================================
-- Reserved names
--
-- A table, not a hard-coded list, so a future teams namespace can check the
-- same words through is_name_reserved(), and adding one is a data insert.
-- RLS on with no policies: clients never read it directly; they learn a name
-- is reserved from is_username_available().
-- ============================================================================
create table public.reserved_names (
  name text primary key check (name = lower(name))
);

alter table public.reserved_names enable row level security;
revoke all on public.reserved_names from anon, authenticated;

insert into public.reserved_names (name) values
  ('admin'), ('administrator'), ('support'), ('help'), ('riftlog'),
  ('doubleconquer'), ('riot'), ('riotgames'), ('riftbound'), ('official'),
  ('mod'), ('moderator'), ('staff'), ('team'), ('system'), ('root'),
  ('null'), ('undefined'), ('me'), ('settings'), ('profile'), ('onboarding'),
  ('guest'), ('anonymous'), ('deleted');

create or replace function public.is_name_reserved(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reserved_names where name = lower(btrim(p_name))
  );
$$;

-- ============================================================================
-- Backfill (destructive, approved): every existing handle becomes neutral, and
-- display names are normalised to what the new CHECK accepts.
-- ============================================================================

-- Drop the old 2–30 rule first; neutral handles satisfy both, but the new rule
-- is only added once every row complies.
alter table public.profiles drop constraint profiles_username_check;

do $$
declare
  r record;
  attempt int;
begin
  for r in select id from public.profiles loop
    attempt := 0;
    loop
      attempt := attempt + 1;
      begin
        update public.profiles
          set username = 'player_' || substr(md5(random()::text || clock_timestamp()::text || r.id::text), 1, 8)
          where id = r.id;
        exit;
      exception
        when unique_violation then
          if attempt >= 20 then
            raise;
          end if;
      end;
    end loop;
  end loop;
end;
$$;

update public.profiles
  set display_name = coalesce(nullif(btrim(left(btrim(display_name), 32)), ''), 'Player')
  where display_name is distinct from coalesce(nullif(btrim(left(btrim(display_name), 32)), ''), 'Player');

alter table public.profiles
  add constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_display_name_format
    check (display_name = btrim(display_name) and char_length(display_name) between 1 and 32);

-- ============================================================================
-- Column privileges: the owner may UPDATE display_name and nothing else.
--
-- RLS decides WHICH row; grants decide WHICH columns. Without this, the
-- existing owner-update policy lets a client rewrite its own username (skipping
-- validation and the rate limit) or stamp onboarded_at. Insert/delete were
-- already impossible via RLS; revoking them too is belt and braces.
-- ============================================================================
revoke insert, update, delete, truncate, references, trigger
  on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ============================================================================
-- Internal helpers (not callable by clients)
-- ============================================================================

-- The caller must be a real account. An anonymous JWT still carries the
-- `authenticated` role, and old anonymous sessions can outlive the switch that
-- disabled anonymous sign-in, so auth.uid() alone isn't enough.
create or replace function public.require_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return uid;
end;
$$;

-- Format → reserved → taken. Expects an already-normalised (lowercase,
-- trimmed) handle. p_self's own current handle counts as available.
create or replace function public.username_status(p_username text, p_self uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_username is null or p_username !~ '^[a-z0-9_]{3,20}$' then
    return 'invalid_format';
  end if;
  if public.is_name_reserved(p_username) then
    return 'reserved';
  end if;
  if exists (
    select 1 from public.profiles
    where lower(username) = p_username and id is distinct from p_self
  ) then
    return 'taken';
  end if;
  return 'available';
end;
$$;

-- The one place a handle changes. Shared by claim_username() and
-- complete_onboarding() so the rules can't drift.
--   before onboarding: no rate limit, username_changed_at untouched
--   after onboarding:  once per 30 days, stamps username_changed_at
-- Returns ok | invalid_format | reserved | taken | rate_limited | no_profile.
create or replace function public.set_username(p_uid uuid, p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
  cur record;
  status text;
begin
  select username, onboarded_at, username_changed_at
    into cur
    from public.profiles
    where id = p_uid
    for update;
  if not found then
    return 'no_profile';
  end if;

  -- Re-claiming your own handle is a no-op, and never burns the rate limit.
  if lower(cur.username) = v then
    return 'ok';
  end if;

  if cur.onboarded_at is not null
     and cur.username_changed_at is not null
     and cur.username_changed_at > now() - interval '30 days' then
    return 'rate_limited';
  end if;

  status := public.username_status(v, p_uid);
  if status <> 'available' then
    return status;
  end if;

  -- The unique index is the real arbiter: the check above can pass for two
  -- callers at once, and the loser lands here.
  begin
    update public.profiles
      set username = v,
          username_changed_at = case
            when cur.onboarded_at is not null then now()
            else username_changed_at
          end
      where id = p_uid;
  exception
    when unique_violation then
      return 'taken';
  end;

  return 'ok';
end;
$$;

-- display_name seed from provider metadata. Each candidate is trimmed and
-- skipped if blank, so a whitespace-only name falls through to the next.
-- Observed Discord shape (Supabase): custom_claims.global_name = display name,
-- full_name = username, name = "username#0". Apple usually sends nothing; email
-- OTP sends nothing.
create or replace function public.seed_display_name(p_meta jsonb, p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(left(btrim(coalesce(
      nullif(btrim(p_meta -> 'custom_claims' ->> 'global_name'), ''),
      nullif(btrim(p_meta ->> 'global_name'), ''),
      nullif(btrim(p_meta ->> 'full_name'), ''),
      nullif(btrim(p_meta ->> 'name'), ''),
      nullif(btrim(p_meta ->> 'preferred_username'), ''),
      nullif(btrim(p_meta ->> 'user_name'), ''),
      nullif(btrim(split_part(coalesce(p_email, p_meta ->> 'email', ''), '@', 1)), ''),
      ''
    )), 32)), ''),
    'Player'
  );
$$;

-- Insert a profile row with a neutral handle, retrying on handle collision.
-- No-op if the row already exists (incl. one created concurrently).
create or replace function public.insert_seed_profile(p_uid uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt int := 0;
begin
  loop
    if exists (select 1 from public.profiles where id = p_uid) then
      return;
    end if;
    attempt := attempt + 1;
    begin
      insert into public.profiles (id, username, display_name)
      values (
        p_uid,
        'player_' || substr(md5(random()::text || clock_timestamp()::text || p_uid::text), 1, 8),
        p_display_name
      );
      return;
    exception
      when unique_violation then
        if attempt >= 20 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

-- ============================================================================
-- Client RPCs
-- ============================================================================

-- Live availability for the onboarding / rename UI. Read-only; the unique
-- index, not this answer, is the guarantee.
-- Returns available | invalid_format | reserved | taken.
create or replace function public.is_username_available(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
begin
  return public.username_status(lower(btrim(coalesce(p_username, ''))), uid);
end;
$$;

-- Change your handle. Returns ok | invalid_format | reserved | taken |
-- rate_limited | no_profile.
create or replace function public.claim_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.set_username(public.require_account(), p_username);
end;
$$;

-- Finish onboarding atomically: claim the handle, set display_name, stamp
-- onboarded_at. A missing profile row (the seed trigger swallowed a failure)
-- is created first, so a user can never be stuck without one.
-- Idempotent: an already-onboarded caller gets 'ok' and nothing changes.
-- Returns ok | invalid_display_name | invalid_format | reserved | taken.
create or replace function public.complete_onboarding(p_username text, p_display_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
  dn text := btrim(coalesce(p_display_name, ''));
  done timestamptz;
  status text;
begin
  select onboarded_at into done from public.profiles where id = uid;
  if done is not null then
    return 'ok';
  end if;

  if char_length(dn) not between 1 and 32 then
    return 'invalid_display_name';
  end if;

  perform public.insert_seed_profile(uid, dn);

  status := public.set_username(uid, p_username);
  if status <> 'ok' then
    return status;
  end if;

  update public.profiles
    set display_name = dn,
        onboarded_at = now()
    where id = uid;

  return 'ok';
end;
$$;

-- ============================================================================
-- Function privileges. Supabase grants EXECUTE on new public functions to anon
-- and authenticated explicitly (not just via PUBLIC), so revoke from all three.
-- Only the three RPCs are callable, and only by signed-in users.
-- ============================================================================
revoke all on function public.is_name_reserved(text) from public, anon, authenticated;
revoke all on function public.require_account() from public, anon, authenticated;
revoke all on function public.username_status(text, uuid) from public, anon, authenticated;
revoke all on function public.set_username(uuid, text) from public, anon, authenticated;
revoke all on function public.seed_display_name(jsonb, text) from public, anon, authenticated;
revoke all on function public.insert_seed_profile(uuid, text) from public, anon, authenticated;

revoke all on function public.is_username_available(text) from public, anon;
revoke all on function public.claim_username(text) from public, anon;
revoke all on function public.complete_onboarding(text, text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.claim_username(text) to authenticated;
grant execute on function public.complete_onboarding(text, text) to authenticated;

-- ============================================================================
-- Seed trigger, rewritten: neutral handle, normalised display_name, no avatar.
-- Still swallows every error — a raising trigger aborts the signup, and
-- complete_onboarding() repairs a missing row anyway.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.insert_seed_profile(
    new.id,
    public.seed_display_name(coalesce(new.raw_user_meta_data, '{}'::jsonb), new.email)
  );
  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: % (%)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

-- The trigger itself (on_auth_user_created) is unchanged and keeps pointing at
-- this function; no need to recreate it.
revoke all on function public.handle_new_user() from public, anon, authenticated;
