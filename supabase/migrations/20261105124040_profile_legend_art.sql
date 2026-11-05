-- Legend art: which art the app shows for a legend — on deck cards, match
-- rows, the hero, the board, the versus screens. Display only: a deck's
-- list (and its deck code) keeps the printing it was imported with.
--
-- Stored on the profile, so it follows the account across devices (the app
-- keeps no settings on the device). Shape, checked by the client:
--   { "overnumbered": boolean,          -- prefer overnumbered art when a legend has it
--     "picks": { "<card id>": "<printing code>" } }  -- per legend; wins over the toggle
-- An empty object means: each deck's own printing, as before.

alter table public.profiles
  add column legend_art jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_legend_art_shape check (
    jsonb_typeof(legend_art) = 'object'
    and pg_column_size(legend_art) <= 16384
  );

-- The owner writes it with a plain update, like display_name / default_deck_id.
grant update (legend_art) on public.profiles to authenticated;
