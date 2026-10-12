-- Managing feedback in the admin inbox: per-entry read / unread, and delete.
--
-- Replaces mark_feedback_read() (everything read on open) — the inbox now
-- marks an entry read when you open it, and you can flip it back. Both RPCs
-- take a list of ids so selection mode is one round trip; a single entry is
-- a one-element list. Admin only, like list_feedback.

drop function if exists public.mark_feedback_read();

-- Mark the given entries read (p_read = true) or unread. Returns how many
-- changed. Unknown ids are skipped.
create or replace function public.set_feedback_read(p_ids uuid[], p_read boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.is_feedback_admin(public.require_account()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'too_many' using errcode = '22023';
  end if;

  if p_read then
    update public.feedback set read_at = now()
      where id = any(p_ids) and read_at is null;
  else
    update public.feedback set read_at = null
      where id = any(p_ids) and read_at is not null;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Delete the given entries for good. Returns how many were deleted.
create or replace function public.delete_feedback(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.is_feedback_admin(public.require_account()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'too_many' using errcode = '22023';
  end if;

  delete from public.feedback where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.set_feedback_read(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.set_feedback_read(uuid[], boolean) to authenticated;
revoke all on function public.delete_feedback(uuid[]) from public, anon, authenticated;
grant execute on function public.delete_feedback(uuid[]) to authenticated;
