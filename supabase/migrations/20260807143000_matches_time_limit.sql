-- Timed mode: the configured clock length for a match.
--
-- One countdown covers the WHOLE match (a Bo1's game, or an entire Bo3
-- including the between-games break) — mirrors Match.timeLimitSeconds in
-- @riftlog/core. null = untimed, which is the default and every existing row.
--
-- Only the configured limit is stored. How long the match actually took is
-- already derivable from started_at / ended_at, and whether it ran into
-- overtime is that duration measured against this limit — so no elapsed or
-- "expired" column is needed, and the DB still derives nothing on its own.
alter table public.matches
  add column time_limit_seconds integer
    check (time_limit_seconds is null or time_limit_seconds > 0);

comment on column public.matches.time_limit_seconds is
  'Configured match clock in seconds; null = untimed. Covers the whole match, never pauses between games.';
