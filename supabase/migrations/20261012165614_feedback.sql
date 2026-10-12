-- In-app feedback: any signed-in user can send a headline + text; only the
-- feedback admins (the app's owner) can read it.
--
-- Anonymous by design: a feedback row has NO user column, so nothing in it
-- says who wrote it. Rate limiting still needs to know who is submitting, so
-- that lives in a separate log (feedback_submissions: user + time, nothing
-- else) that is NOT linked to the feedback rows and is purged after a day —
-- it only has to cover the longest rate-limit window.
--
-- Clients get no table privileges on any of the three tables. Everything goes
-- through the RPCs below:
--   submit_feedback(headline, body)  → ok | invalid_headline | invalid_body | rate_limited
--   feedback_unread_count()          → unread count for an admin, null for everyone else
--   list_feedback()                  → all feedback, newest first (admin only)
--   mark_feedback_read()             → stamps read_at on everything unread (admin only)

-- ============================================================================
-- Tables
-- ============================================================================

-- Who may read feedback. Keyed by account id, never by handle (handles are
-- renameable). RLS on, no policies, no grants: only the definer RPCs see it.
create table public.feedback_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.feedback_admins enable row level security;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  headline text not null
    check (headline = btrim(headline) and char_length(headline) between 1 and 80),
  body text not null
    check (body = btrim(body) and char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- null = not yet seen by an admin; drives the counter on the inbox button.
  read_at timestamptz
);
alter table public.feedback enable row level security;

create index feedback_unread_idx on public.feedback (created_at) where read_at is null;

-- Rate-limit log. Deliberately unlinked from feedback (no feedback id).
create table public.feedback_submissions (
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.feedback_submissions enable row level security;

create index feedback_submissions_user_idx
  on public.feedback_submissions (user_id, created_at);

revoke all on public.feedback_admins, public.feedback, public.feedback_submissions
  from public, anon, authenticated;

-- The owner's account. A one-off data insert by the handle as it is today;
-- after this it's held by id, so a later rename changes nothing. A no-op on a
-- database without that profile.
insert into public.feedback_admins (user_id)
  select id from public.profiles where lower(username) = 'morisv'
  on conflict do nothing;

-- ============================================================================
-- RPCs
-- ============================================================================

-- Internal: is this account a feedback admin?
create or replace function public.is_feedback_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.feedback_admins where user_id = p_uid);
$$;

-- Send feedback. Limits per account: 3 per 10 minutes, 10 per 24 hours.
create or replace function public.submit_feedback(p_headline text, p_body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
  v_headline text := btrim(coalesce(p_headline, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_headline) not between 1 and 80 then
    return 'invalid_headline';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    return 'invalid_body';
  end if;

  -- Serialise one account's submissions so parallel calls can't all pass the
  -- count check at once.
  perform pg_advisory_xact_lock(hashtextextended('feedback:' || uid::text, 0));

  -- Nothing older than the longest window is ever needed.
  delete from public.feedback_submissions
    where created_at < now() - interval '24 hours';

  if (select count(*) from public.feedback_submissions
        where user_id = uid and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.feedback_submissions
        where user_id = uid) >= 10 then
    return 'rate_limited';
  end if;

  insert into public.feedback_submissions (user_id) values (uid);
  insert into public.feedback (headline, body) values (v_headline, v_body);
  return 'ok';
end;
$$;

-- The admin's unread count, or null for anyone who isn't an admin. One call
-- tells the client both whether to show the inbox and what its badge says.
create or replace function public.feedback_unread_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
begin
  if not public.is_feedback_admin(uid) then
    return null;
  end if;
  return (select count(*)::integer from public.feedback where read_at is null);
end;
$$;

create or replace function public.list_feedback()
returns table (
  id uuid,
  headline text,
  body text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_feedback_admin(public.require_account()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select f.id, f.headline, f.body, f.created_at, f.read_at
    from public.feedback f
    order by f.created_at desc
    limit 500;
end;
$$;

create or replace function public.mark_feedback_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_feedback_admin(public.require_account()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.feedback set read_at = now() where read_at is null;
end;
$$;

revoke all on function public.is_feedback_admin(uuid) from public, anon, authenticated;

revoke all on function public.submit_feedback(text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text) to authenticated;
revoke all on function public.feedback_unread_count() from public, anon, authenticated;
grant execute on function public.feedback_unread_count() to authenticated;
revoke all on function public.list_feedback() from public, anon, authenticated;
grant execute on function public.list_feedback() to authenticated;
revoke all on function public.mark_feedback_read() from public, anon, authenticated;
grant execute on function public.mark_feedback_read() to authenticated;
