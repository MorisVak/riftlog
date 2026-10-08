-- Notes: one free-text note per game, and one for the whole match (the
-- "round"). Written by the player — after a game (between-games screen), when
-- the round ends (match-complete screen), or any time later from the match
-- detail.
--
-- Plain text, nullable (no note = null; the client stores blank as null).
-- Capped at 2000 characters each: room for a real debrief, not a document.
-- Editing later is a plain owner-scoped UPDATE — the existing matches/games
-- update policies already cover it (user_id = auth.uid()).

alter table public.matches
  add column notes text check (notes is null or char_length(notes) <= 2000);

alter table public.games
  add column notes text check (notes is null or char_length(notes) <= 2000);
