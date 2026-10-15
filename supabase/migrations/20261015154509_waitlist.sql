-- Website waitlist (riftlog.net): a visitor leaves an email to hear when
-- Riftlog launches. No account involved — the site calls the RPC with the
-- publishable key as `anon`.
--
-- Clients get no table privileges. Everything goes through:
--   join_waitlist(email, privacy_version) → ok | invalid_email | rate_limited
--
-- It answers `ok` for an address that is already on the list, so the form
-- can't be used to find out whether someone signed up.
--
-- There's no per-visitor identity to rate-limit on (and storing IPs would be
-- more personal data than the list itself), so the limit is global: a burst
-- cap across all callers, counted in an unlinked attempt log that only keeps
-- the last hour. Generous for real signups, a ceiling for a script.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.waitlist (
  -- Stored normalised (trimmed, lowercase), so uniqueness is case-insensitive
  -- without the citext extension.
  email text primary key
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 254
      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  -- When they joined = when they gave consent (submitting is the opt-in).
  created_at timestamptz not null default now(),
  -- Which privacy policy text they agreed to (GDPR accountability), e.g. the
  -- policy's "last updated" date. Set by the site, not by the visitor.
  privacy_version text not null
    check (char_length(privacy_version) between 1 and 40)
);
alter table public.waitlist enable row level security;

-- Burst log for the global rate limit. Deliberately no email or IP in it.
create table public.waitlist_attempts (
  created_at timestamptz not null default now()
);
alter table public.waitlist_attempts enable row level security;

create index waitlist_attempts_created_idx on public.waitlist_attempts (created_at);

revoke all on public.waitlist, public.waitlist_attempts
  from public, anon, authenticated;

-- ============================================================================
-- RPCs
-- ============================================================================

-- Join the waitlist. Global limit: 30 attempts per 10 minutes.
create or replace function public.join_waitlist(p_email text, p_privacy_version text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_version text := btrim(coalesce(p_privacy_version, ''));
begin
  if char_length(v_email) not between 3 and 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid_email';
  end if;
  if char_length(v_version) not between 1 and 40 then
    raise exception 'invalid privacy_version' using errcode = '22023';
  end if;

  -- One global counter, so serialise every caller around it.
  perform pg_advisory_xact_lock(hashtextextended('waitlist', 0));

  delete from public.waitlist_attempts where created_at < now() - interval '1 hour';

  if (select count(*) from public.waitlist_attempts
        where created_at > now() - interval '10 minutes') >= 30 then
    return 'rate_limited';
  end if;

  insert into public.waitlist_attempts default values;
  insert into public.waitlist (email, privacy_version)
    values (v_email, v_version)
    on conflict (email) do nothing;
  return 'ok';
end;
$$;

revoke all on function public.join_waitlist(text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;
