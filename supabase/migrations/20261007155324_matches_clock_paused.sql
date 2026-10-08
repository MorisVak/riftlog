-- How long a timed match's clock was paused, in total (milliseconds).
--
-- Timed mode stores the configured limit only and derives everything else from
-- timestamps (20260807143000_matches_time_limit.sql). That stopped being enough
-- once the board gained a pause control: "played" was ended_at - started_at,
-- which counted paused time as play — History showed a 5-minute pause as 5
-- extra minutes, and could flag overtime that never happened.
--
-- So the one extra fact is persisted: total paused time. played =
-- (ended_at - started_at) - clock_paused_ms, and overtime compares that against
-- time_limit_seconds. It's a settled total, written once with the finished
-- match — still no live clock state in the database.
--
-- Existing rows default to 0 (no pause recorded), which reads exactly as before.

alter table public.matches
  add column clock_paused_ms integer not null default 0
    check (clock_paused_ms >= 0);
