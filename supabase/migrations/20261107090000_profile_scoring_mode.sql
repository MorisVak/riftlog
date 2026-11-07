-- Scoring mode: how the board scores, chosen on the Profile tab.
--
--   'detailed' — a point is scored by saying HOW: conquer / hold / special
--                (the default, the board as it has always been).
--   'simple'   — a plain counter, − and +, like most score apps. Points are
--                recorded in games.events with "action": null.
--
-- Stored on the profile so it follows the account across devices (the app
-- keeps no settings on the device). The match itself doesn't store it: each
-- game's recorded points already say whether they carry an action.

alter table public.profiles
  add column scoring_mode text not null default 'detailed'
    constraint profiles_scoring_mode_check check (scoring_mode in ('detailed', 'simple'));

-- The owner writes it with a plain update, like legend_art / default_deck_id.
grant update (scoring_mode) on public.profiles to authenticated;
