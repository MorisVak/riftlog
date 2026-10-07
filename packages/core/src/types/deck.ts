/**
 * One entry in a decklist: a card and how many copies.
 *
 * `code` is the full printing code including any variant suffix (e.g.
 * `SFD-149a`). It is null for text imports, which carry names only; once a
 * card catalog exists, art resolves by code when present and by name when not,
 * so stored lists never need migrating to gain art.
 */
export type CardRef = {
  name: string;
  code: string | null;
  count: number;
};

/**
 * A Riftbound decklist, by section, in the order the source listed the cards.
 *
 * `main` EXCLUDES the chosen-champion copy, matching the text export format:
 * a legal list has 39 cards in `main` plus the one `champion` for the 40-card
 * main deck. Anything that displays or counts the main deck adds the champion
 * back — use `sectionTotals` rather than re-deriving it.
 *
 * `additionalLegends` isn't part of the game yet. It exists so an import that
 * lists more than one legend loses nothing; the UI hides it while empty.
 */
export type DeckList = {
  legend: CardRef | null;
  champion: CardRef | null;
  main: CardRef[];
  battlefields: CardRef[];
  runes: CardRef[];
  sideboard: CardRef[];
  additionalLegends: CardRef[];
};

/** How a deck entered Riftlog. Mirrors `decks.import_source`. */
export type DeckImportSource = 'text' | 'piltover_code' | 'manual';

/**
 * A frozen, point-in-time copy of a deck used in a match.
 *
 * Snapshots are immutable: once a match is created with a deck, that match
 * keeps this exact snapshot forever, even if the underlying deck is edited
 * or deleted later. `versionId` names the immutable `deck_versions` row it was
 * taken from, which is what match history, per-deck stats and a shared match's
 * opponent view will reference.
 */
export type DeckSnapshot = {
  /** The owning deck, or null for a list that was never saved as a deck. */
  deckId: string | null;
  /** The immutable version this snapshot pins, or null if unsaved. */
  versionId: string | null;
  name: string;
  source: DeckImportSource;
  /** The original deck code for `piltover_code` imports; null otherwise. */
  sourceCode: string | null;
  list: DeckList;
  importedAt: string; // ISO-8601 timestamp
};
