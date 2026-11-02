-- promo printing codes carry their parent set; overrides may set overnumbered.
--
-- A promo set (OPP / PR / JDG) numbers each card by its number in the set it
-- reprints, so OPP-086 alone is ambiguous: World Atlas from SFD and Zilean
-- from UNL. Promo codes therefore name the parent set too:
--
--   OPP-SFD-086, OPP-UNL-086, OPP-OGN-259m (Metal), PR-OGN-246b, JDG-UNL-087
--
-- The parent set rides in collector_number ('SFD-086'), so the existing
-- "code = set_code || '-' || collector_number || variant" check still holds.
-- Deckable codes (SFD-149a, UNL-229*, VEN-R01, VEN-SP1) are unchanged: the
-- parent segment is optional, and only the importer adds it, for promo sets.
--
-- Additive: both checks only get wider, and card_printings is still empty.
-- Constraint names are Postgres's defaults from 20261102184149_card_catalog;
-- no "if exists", so a wrong name fails the migration instead of silently
-- skipping it.

alter table public.card_printings
  drop constraint card_printings_code_check,
  add constraint card_printings_code_check
    check (code ~ '^[A-Z]{2,4}-([A-Z]{2,4}-)?(R|SP)?[0-9]{1,3}[a-z*]?$'),
  drop constraint card_printings_collector_number_check,
  add constraint card_printings_collector_number_check
    check (collector_number ~ '^([A-Z]{2,4}-)?(R|SP)?[0-9]{1,3}$');

-- Overrides may also correct the overnumbered flag (a source entry numbered
-- above its set size but not flagged, e.g. VEN-194).
alter table public.catalog_overrides
  drop constraint catalog_overrides_field_check,
  add constraint catalog_overrides_field_check check (field in (
    'code', 'name', 'type', 'supertype', 'domains', 'text', 'image_url',
    'orientation', 'status', 'overnumbered', 'skip'
  ));
