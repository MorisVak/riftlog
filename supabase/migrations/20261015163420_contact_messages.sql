-- Website contact form (riftlog.net/contact). It's the Impressum's second
-- fast contact channel next to email (§ 5 DDG), so it must actually reach the
-- owner: messages are read in the Supabase dashboard (Table Editor →
-- contact_messages). No account involved — the site calls the RPC as `anon`.
--
-- Clients get no table privileges. Everything goes through:
--   submit_contact(name, email, message) → ok | invalid_name | invalid_email
--                                           | invalid_message | rate_limited
--
-- Same global burst limit as the waitlist, in its own unlinked attempt log
-- (timestamps only, no email or IP), kept for an hour.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 80),
  -- Where to reply. Stored trimmed + lowercase, like the waitlist.
  email text not null
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 254
      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  message text not null
    check (message = btrim(message) and char_length(message) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- null = not yet handled; set it (in the dashboard) once answered.
  read_at timestamptz
);
alter table public.contact_messages enable row level security;

create table public.contact_attempts (
  created_at timestamptz not null default now()
);
alter table public.contact_attempts enable row level security;

create index contact_attempts_created_idx on public.contact_attempts (created_at);

revoke all on public.contact_messages, public.contact_attempts
  from public, anon, authenticated;

-- ============================================================================
-- RPCs
-- ============================================================================

-- Send a message. Global limit: 10 attempts per 10 minutes.
create or replace function public.submit_contact(p_name text, p_email text, p_message text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 1 and 80 then
    return 'invalid_name';
  end if;
  if char_length(v_email) not between 3 and 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid_email';
  end if;
  if char_length(v_message) not between 1 and 2000 then
    return 'invalid_message';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('contact', 0));

  delete from public.contact_attempts where created_at < now() - interval '1 hour';

  if (select count(*) from public.contact_attempts
        where created_at > now() - interval '10 minutes') >= 10 then
    return 'rate_limited';
  end if;

  insert into public.contact_attempts default values;
  insert into public.contact_messages (name, email, message)
    values (v_name, v_email, v_message);
  return 'ok';
end;
$$;

revoke all on function public.submit_contact(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_contact(text, text, text) to anon, authenticated;
