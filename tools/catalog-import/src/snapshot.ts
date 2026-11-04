/**
 * Riftcodex snapshots: the raw responses of one complete fetch, saved with
 * when they were fetched. Every successful live fetch writes one to
 * `.cache/` (gitignored), and `--from-snapshot <file>` runs the import from a
 * saved one instead of the network — same transform, plan, stops and report.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RIFTCODEX_URL, type RiftcodexRaw } from './riftcodex';

export const CACHE_DIR = fileURLToPath(new URL('../.cache/', import.meta.url));

export type Snapshot = RiftcodexRaw & {
  format: 1;
  source: string;
  /** ISO timestamp of the fetch. */
  fetched_at: string;
};

/** Where the data came from, for the report. */
export type SourceInfo = {
  /** "Riftcodex" or "Riot card gallery". */
  label: string;
  kind: 'live' | 'snapshot';
  fetchedAt: string;
  path: string | null;
};

export function saveSnapshot(raw: RiftcodexRaw, fetchedAt: Date): string {
  mkdirSync(CACHE_DIR, { recursive: true });
  const stamp = fetchedAt.toISOString().replace(/[:.]/g, '-');
  const path = `${CACHE_DIR}riftcodex-${stamp}.json`;
  const snapshot: Snapshot = { format: 1, source: RIFTCODEX_URL, fetched_at: fetchedAt.toISOString(), ...raw };
  writeFileSync(path, JSON.stringify(snapshot));
  return path;
}

export function loadSnapshot(path: string): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Can't read snapshot ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const s = parsed as Partial<Snapshot> | null;
  if (
    !s ||
    s.format !== 1 ||
    typeof s.fetched_at !== 'string' ||
    Number.isNaN(Date.parse(s.fetched_at)) ||
    !Array.isArray(s.sets) ||
    !Array.isArray(s.cards)
  ) {
    throw new Error(`${path} is not a Riftcodex snapshot (format 1 with fetched_at, sets and cards).`);
  }
  return s as Snapshot;
}
