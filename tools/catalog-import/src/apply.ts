/**
 * Reads the current catalog and writes a plan. Takes a Supabase client made
 * with the SECRET key (RLS bypassed) — never call this from an app.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@riftlog/core';
import type { CatalogSnapshot, Plan } from './plan';

type Client = SupabaseClient<Database>;
type CatalogTable = 'sets' | 'cards' | 'card_printings' | 'catalog_overrides';

const PAGE = 1000; // PostgREST's default row cap per request
const CHUNK = 500;

async function readAll<T extends CatalogTable>(
  db: Client,
  table: T,
  orderBy: string,
): Promise<Database['public']['Tables'][T]['Row'][]> {
  const rows: Database['public']['Tables'][T]['Row'][] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .order(orderBy)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`reading ${table}: ${error.message}`);
    // supabase-js can't follow a generic table name; the signature pins the type.
    rows.push(...(data as unknown as Database['public']['Tables'][T]['Row'][]));
    if (data.length < PAGE) return rows;
  }
}

export async function readCatalog(db: Client): Promise<CatalogSnapshot> {
  const [sets, cards, printings, overrides] = await Promise.all([
    readAll(db, 'sets', 'code'),
    readAll(db, 'cards', 'id'),
    readAll(db, 'card_printings', 'code'),
    readAll(db, 'catalog_overrides', 'id'),
  ]);
  return { sets, cards, printings, overrides };
}

export async function readCatalogVersion(db: Client): Promise<number> {
  const { data, error } = await db.from('catalog_meta').select('version').single();
  if (error) throw new Error(`reading catalog_meta: ${error.message}`);
  return data.version;
}

async function upsert<T extends CatalogTable>(
  db: Client,
  table: T,
  rows: Database['public']['Tables'][T]['Insert'][],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + CHUNK) as never, { onConflict });
    if (error) throw new Error(`writing ${table}: ${error.message}`);
  }
}

/**
 * Writes inserts and updates in dependency order: overrides, sets, cards,
 * printings. Not one transaction (PostgREST), but idempotent: after a failure,
 * re-running picks up where it stopped. The catalog version bumps itself
 * (triggers) only for statements that changed rows.
 */
export async function applyPlan(db: Client, plan: Plan): Promise<void> {
  const rows = <W>(t: { insert: W[]; update: { row: W }[] }) => [...t.insert, ...t.update.map((u) => u.row)];
  await upsert(db, 'catalog_overrides', rows(plan.overrides), 'riftcodex_id,field');
  await upsert(db, 'sets', rows(plan.sets), 'code');
  await upsert(db, 'cards', rows(plan.cards), 'id');
  await upsert(db, 'card_printings', rows(plan.printings), 'code');
}
