import {
  isDeckList,
  type Database,
  type DeckImportSource,
  type DeckList,
  type DeckSnapshot,
} from '@riftlog/core';
import { supabase } from './supabase';

/**
 * Decks, read from Postgres on demand and never cached on-device — same rule
 * as match history. RLS scopes every read to the caller's own rows.
 *
 * Creating goes through the `create_deck` RPC: clients can't insert into
 * `decks` / `deck_versions` directly, so a deck never exists without a
 * version. Versions are immutable; an edit (not built yet) will add one.
 *
 * Deleting is a SOFT delete (`delete_deck` stamps `archived_at`), because
 * match history will pin deck versions. Every read here filters archived
 * decks out, so to the player a deleted deck is simply gone.
 */

/** Mirrors the `decks.name` CHECK (trimmed, 1–60). */
export const DECK_NAME_MAX = 60;

export const isValidDeckName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= DECK_NAME_MAX;
};

/** A deck with the list of its current version. */
export type Deck = {
  id: string;
  name: string;
  importSource: DeckImportSource;
  sourceCode: string | null;
  /** The immutable version `list` came from — what a match will pin. */
  versionId: string;
  list: DeckList;
  createdAt: string;
  updatedAt: string;
};

// decks ↔ deck_versions has two relationships (a version's deck, and a
// deck's current version), so the embed names the FK to pick the second.
const DECK_COLUMNS =
  'id, name, import_source, source_code, created_at, updated_at, ' +
  'current_version:deck_versions!decks_current_version_fkey(id, list)';

type CreateDeckArgs = Database['public']['Functions']['create_deck']['Args'];

const IMPORT_SOURCES: readonly DeckImportSource[] = [
  'text',
  'piltover_code',
  'manual',
];

type DeckRow = {
  id: string;
  name: string;
  import_source: string;
  source_code: string | null;
  created_at: string;
  updated_at: string;
  current_version: { id: string; list: unknown } | null;
};

/**
 * Narrow a row at the boundary. A deck without a readable current version
 * shouldn't exist (create_deck sets it atomically); if one does, it's skipped
 * rather than crashing a list render.
 */
function toDeck(row: DeckRow): Deck | null {
  const version = row.current_version;
  if (!version || !isDeckList(version.list)) {
    if (__DEV__) console.warn(`[decks] deck ${row.id} has no valid current version`);
    return null;
  }
  const importSource = (IMPORT_SOURCES as readonly string[]).includes(
    row.import_source,
  )
    ? (row.import_source as DeckImportSource)
    : 'manual';
  return {
    id: row.id,
    name: row.name,
    importSource,
    sourceCode: row.source_code,
    versionId: version.id,
    list: version.list,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The caller's decks, most recently updated first. */
export async function fetchMyDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select(DECK_COLUMNS)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .returns<DeckRow[]>();
  if (error) throw error;
  return data.map(toDeck).filter((d): d is Deck => d !== null);
}

/** One deck, or null if it doesn't exist, was deleted, or isn't the caller's. */
export async function fetchDeck(id: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select(DECK_COLUMNS)
    .eq('id', id)
    .is('archived_at', null)
    .returns<DeckRow[]>()
    .maybeSingle();
  if (error) throw error;
  return data ? toDeck(data) : null;
}

/**
 * Save a new deck and its first version in one transaction. Returns the deck
 * id. The server re-checks name / source / list shape; the caller is expected
 * to have validated already, so a rejection here is a bug and is thrown.
 */
export async function createDeck(input: {
  name: string;
  list: DeckList;
  importSource?: DeckImportSource;
  sourceCode?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_deck', {
    p_name: input.name.trim(),
    p_import_source: input.importSource ?? 'text',
    // The SQL param has no default, so the generated type requires a string;
    // create_deck stores '' as null.
    p_source_code: input.sourceCode ?? '',
    // DeckList is plain JSON (strings, numbers, nulls, arrays); the generated
    // `Json` type just can't see that structurally.
    p_list: input.list as unknown as CreateDeckArgs['p_list'],
  });
  if (error) throw error;
  return data;
}

/**
 * Rename a deck — the one direct write clients have (`UPDATE (name)` on
 * `decks`, owner-only by RLS). The list itself is immutable and unaffected.
 * Returns the saved (trimmed) name and the new `updated_at`.
 */
export async function renameDeck(
  id: string,
  name: string,
): Promise<{ name: string; updatedAt: string }> {
  const { data, error } = await supabase
    .from('decks')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('name, updated_at')
    .single();
  if (error) throw error;
  return { name: data.name, updatedAt: data.updated_at };
}

/**
 * Delete a deck. Soft: the server stamps `archived_at` and keeps its versions
 * (match history will reference them), and every read above hides it. There
 * is no restore yet, so the UI treats this as final.
 */
export async function deleteDeck(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_deck', { p_deck_id: id });
  if (error) throw error;
}

/**
 * Delete several decks at once (multi-select in "My decks"). Same soft delete
 * as `deleteDeck`, in one round trip; ids that aren't the caller's are skipped
 * server-side.
 */
export async function deleteDecks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.rpc('delete_decks', { p_deck_ids: ids });
  if (error) throw error;
}

/**
 * A saved deck as the snapshot a match carries (`Player.deck`). It pins the
 * deck's CURRENT version; that version id is what the match persists.
 */
export const toDeckSnapshot = (deck: Deck): DeckSnapshot => ({
  deckId: deck.id,
  versionId: deck.versionId,
  name: deck.name,
  source: deck.importSource,
  sourceCode: deck.sourceCode,
  list: deck.list,
  importedAt: deck.createdAt,
});
