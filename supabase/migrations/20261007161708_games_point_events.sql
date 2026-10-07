-- Point-by-point record of a game, for the match detail's timeline.
--
-- Each element mirrors @riftlog/core's PointEvent:
--   { "atMs": <ms after games.started_at>, "playerId": "p1" | "p2",
--     "delta": 1 | -1, "action": "conquer" | "hold" | "special" | null }
-- delta -1 / action null is a point taken back on the board.
--
-- Like the rest of a game row it's written once, settled, by the client; the
-- database never replays or re-derives scores from it (scores_at_end stays the
-- authority). Games recorded before this column read as '[]' — no timeline.
-- The size cap is generous: a long game is a few hundred events of ~70 bytes.

alter table public.games
  add column events jsonb not null default '[]'::jsonb
    check (jsonb_typeof(events) = 'array' and octet_length(events::text) <= 65536);
