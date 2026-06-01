/**
 * A frozen, point-in-time copy of a deck used in a match.
 *
 * Snapshots are immutable: once a match is created with a deck, that match
 * keeps this exact snapshot forever, even if the underlying deck is edited
 * or deleted later. This is what makes "match history with deck context"
 * and "deck-version diffing" possible.
 */
export type DeckSnapshot = {
  source: 'piltover_archive' | 'riftmana' | 'manual' | null;
  sourceUrl?: string;
  name: string;
  legend?: string;
  cards: Array<{ id: string; quantity: number; name: string }>;
  sideboard?: Array<{ id: string; quantity: number; name: string }>;
  importedAt: string; // ISO-8601 timestamp
};
