-- In-app account deletion (App Store Guideline 5.1.1(v)).
--
-- One RPC: the signed-in user deletes their own auth.users row. Everything
-- else goes with it through the FKs — profiles, matches (→ games), decks
-- (→ deck_versions), feedback_submissions, admin rows: all
-- `references auth.users (id) on delete cascade`. Feedback itself carries no
-- user column, so anonymous feedback stays anonymous (and stays).
--
-- security definer so it may touch auth.users; it only ever deletes the
-- caller's own row (auth.uid(), via require_account — no argument to abuse).
-- The client signs out locally afterwards; its token has no user left.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_account();
begin
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
