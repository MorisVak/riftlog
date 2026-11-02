import { Directory, File, Paths } from 'expo-file-system';
import type { Catalog } from '@riftlog/core';
import { supabase } from '@/lib/supabase';

/**
 * The card catalog, cached on the device as one JSON file with its version.
 *
 * This is reference data, not match data: a replaceable copy of the public
 * catalog tables (Postgres stays the source of truth), refetched in full only
 * when `catalog_meta.version` moves. A file rather than an AsyncStorage key
 * because the catalog grows with every set (Android caps a single
 * AsyncStorage entry at about 2 MB).
 */

const DIR = new Directory(Paths.document, 'catalog');
const FILE = new File(DIR, 'catalog.json');
const PAGE = 1000; // PostgREST's default row cap per request

/** The cached catalog, or null if there is none (or it's unreadable). */
export async function readCachedCatalog(): Promise<Catalog | null> {
  try {
    if (!FILE.exists) return null;
    const parsed = JSON.parse(await FILE.text()) as Catalog;
    return typeof parsed.version === 'number' && Array.isArray(parsed.cards) ? parsed : null;
  } catch {
    // A corrupt cache is just a missing one: drop it and refetch.
    try {
      FILE.delete();
    } catch {}
    return null;
  }
}

function writeCachedCatalog(catalog: Catalog): void {
  if (!DIR.exists) DIR.create({ intermediates: true });
  // Write aside, then swap, so a crash mid-write never leaves half a file.
  const temp = new File(DIR, 'catalog.json.tmp');
  if (temp.exists) temp.delete();
  temp.write(JSON.stringify(catalog));
  if (FILE.exists) FILE.delete();
  temp.move(FILE);
}

/** The catalog's current version on the server (one tiny row). */
export async function fetchCatalogVersion(): Promise<number> {
  const { data, error } = await supabase.from('catalog_meta').select('version').single();
  if (error) throw error;
  return data.version;
}

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Downloads the whole catalog — only the columns the app reads. */
async function fetchCatalog(version: number): Promise<Catalog> {
  const [sets, cards, printings] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from('sets')
        .select('code, name, released_on, deck_code_set_id, status')
        .order('code')
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('cards')
        .select('id, name, name_key, type, supertype, domains, energy, might, power, current_text, status')
        .order('id')
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('card_printings')
        .select(
          'code, card_id, set_code, variant, alt_art, overnumbered, signed, promo, image_url, storage_path, orientation, artist, status',
        )
        .order('code')
        .range(from, to),
    ),
  ]);
  return { version, sets, cards, printings };
}

/**
 * Brings the cached catalog up to date: a version check, then a full fetch
 * only if the version moved. Returns the fresh catalog, or null when the
 * cache was already current. Throws when offline; the caller keeps the cache.
 */
export async function syncCatalog(cachedVersion: number | null): Promise<Catalog | null> {
  const version = await fetchCatalogVersion();
  if (version === cachedVersion) return null;
  const catalog = await fetchCatalog(version);
  writeCachedCatalog(catalog);
  return catalog;
}
