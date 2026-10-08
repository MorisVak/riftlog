-- The deck you played, on the match.
--
-- A match pins the exact immutable deck VERSION it was played with (see
-- 20260924155255_decks.sql), never the deck itself: renaming a deck, editing it
-- (a new version, later), or deleting it (soft) must not change what history
-- says you played. Optional — a match can be played with no deck chosen.
--
-- This is the match OWNER's deck (the device owner, player p1). A match-mode
-- opponent's deck, when that exists, gets its own column.
--
-- Ownership is enforced by the key itself: the composite FK below means a
-- match can only reference a version owned by the match's own user_id, so no
-- client can point a match at someone else's deck.

-- Target for the composite FK.
alter table public.deck_versions
  add constraint deck_versions_owner_id_id_key unique (owner_id, id);

alter table public.matches add column deck_version_id uuid;

-- MATCH SIMPLE (the default): a null deck_version_id is simply "no deck".
alter table public.matches
  add constraint matches_deck_version_fkey
  foreign key (user_id, deck_version_id)
  references public.deck_versions (owner_id, id);

-- For future per-deck stats ("matches played with this deck").
create index matches_deck_version_idx
  on public.matches (deck_version_id)
  where deck_version_id is not null;
