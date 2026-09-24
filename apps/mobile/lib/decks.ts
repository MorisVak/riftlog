import {
  isDeckList,
  type Database,
  type DeckImportSource,
  type DeckList,
} from '@riftlog/core';
import { supabase } from './supabase';

/**
 * Decks, read from Postgres on demand and never cached on-device — same rule
 * as match history. RLS scopes every read to the caller's own rows.
 *
 * Writes go through the `create_deck` RPC only: clients can't insert into
 * `decks` / `deck_versions` directly, so a deck never exists without a
 * version. Versions are immutable; an edit (not built yet) will add one.
 */

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
    .order('updated_at', { ascending: false })
    .returns<DeckRow[]>();
  if (error) throw error;
  return data.map(toDeck).filter((d): d is Deck => d !== null);
}

/** One deck, or null if it doesn't exist or isn't the caller's. */
export async function fetchDeck(id: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select(DECK_COLUMNS)
    .eq('id', id)
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
