/**
 * Seeds / syncs the card catalog from Riftcodex, or — for sets Riftcodex
 * doesn't have yet — from Riot's official card gallery.
 *
 *   pnpm catalog:import                    dry run: fetch, compare, report — writes nothing
 *   pnpm catalog:import --apply            write the reported changes to the database
 *   pnpm catalog:import --report out.json  also save the full plan as JSON
 *   pnpm catalog:import --from-snapshot <file>
 *                                          use a saved snapshot instead of fetching
 *   pnpm catalog:import --source gallery [--only-set RAD]
 *                                          import from Riot's card gallery (one page load)
 *                                          as source 'riot'; only RAD unless --only-set says
 *
 * Every successful live fetch is saved to .cache/ (gitignored) as a snapshot
 * (Riftcodex: JSON; gallery: the page's HTML).
 *
 * Uses the secret key from supabase/.env. Never run this from an app.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@riftlog/core';
import { applyPlan, readCatalog, readCatalogVersion } from './apply';
import { GALLERY_URL, galleryToEntries, parseGalleryHtml } from './gallery';
import { loadEnv } from './env';
import { parseOverrides } from './overrides';
import { hasChanges, makePlan } from './plan';
import { formatReport } from './report';
import {
  fetchRiftcodexRaw,
  parseRiftcodex,
  type RiftcodexCard,
  type RiftcodexRaw,
  type RiftcodexSet,
} from './riftcodex';
import { CACHE_DIR, loadSnapshot, saveSnapshot, type SourceInfo } from './snapshot';
import { transform } from './transform';

// pnpm runs scripts from the package folder; resolve paths from where the
// command was typed (INIT_CWD) so repo-root-relative paths work.
const fromCaller = (path: string): string => resolve(process.env.INIT_CWD ?? process.cwd(), path);

const USER_AGENT = 'Riftlog catalog importer (https://www.riftlog.net, support@riftlog.net)';

async function main(): Promise<number> {
  let apply = false;
  let reportPath: string | undefined;
  let snapshotPath: string | undefined;
  let fromGallery = false;
  let onlySets = ['RAD'];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--report' && args[i + 1]) reportPath = fromCaller(args[++i] ?? '');
    else if (arg === '--from-snapshot' && args[i + 1]) snapshotPath = fromCaller(args[++i] ?? '');
    else if (arg === '--source' && (args[i + 1] === 'gallery' || args[i + 1] === 'riftcodex')) {
      fromGallery = args[++i] === 'gallery';
    } else if (arg === '--only-set' && args[i + 1]) onlySets = (args[++i] ?? '').split(',');
    else {
      console.error(
        `Unknown argument: ${arg}\nUsage: catalog:import [--apply] [--report <file.json>] [--from-snapshot <file>] [--source riftcodex|gallery] [--only-set RAD]`,
      );
      return 2;
    }
  }

  const env = loadEnv();
  const db = createClient<Database>(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const overrides = parseOverrides(
    JSON.parse(readFileSync(new URL('../overrides.json', import.meta.url), 'utf8')),
  );

  let entries: { cards: RiftcodexCard[]; sets: RiftcodexSet[] };
  let source: SourceInfo;
  if (fromGallery) {
    let html: string;
    if (snapshotPath) {
      html = readFileSync(snapshotPath, 'utf8');
      source = {
        label: 'Riot card gallery',
        kind: 'snapshot',
        fetchedAt: statSync(snapshotPath).mtime.toISOString(),
        path: snapshotPath,
      };
    } else {
      console.error(`Fetching ${GALLERY_URL} (one page)…`);
      const res = await fetch(GALLERY_URL, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`GET ${GALLERY_URL} → HTTP ${res.status}`);
      html = await res.text();
      const fetchedAt = new Date();
      mkdirSync(CACHE_DIR, { recursive: true });
      const saved = `${CACHE_DIR}gallery-${fetchedAt.toISOString().replace(/[:.]/g, '-')}.html`;
      writeFileSync(saved, html);
      console.error(`Snapshot saved to ${saved}`);
      source = { label: 'Riot card gallery', kind: 'live', fetchedAt: fetchedAt.toISOString(), path: saved };
    }
    entries = galleryToEntries(parseGalleryHtml(html), { onlySets });
    console.error(`Gallery: ${entries.cards.length} entries in ${onlySets.join(', ')}`);
  } else {
    let raw: RiftcodexRaw;
    if (snapshotPath) {
      const snapshot = loadSnapshot(snapshotPath);
      raw = snapshot;
      source = { label: 'Riftcodex', kind: 'snapshot', fetchedAt: snapshot.fetched_at, path: snapshotPath };
    } else {
      console.error('Fetching Riftcodex…');
      raw = await fetchRiftcodexRaw({
        userAgent: USER_AGENT,
        onProgress: (m) => process.stderr.write(`\r  ${m}      `),
      });
      process.stderr.write('\n');
      const fetchedAt = new Date();
      const saved = saveSnapshot(raw, fetchedAt);
      console.error(`Snapshot saved to ${saved}`);
      source = { label: 'Riftcodex', kind: 'live', fetchedAt: fetchedAt.toISOString(), path: saved };
    }
    entries = parseRiftcodex(raw);
  }

  const today = new Date().toISOString().slice(0, 10);
  const desired = transform({
    ...entries,
    overrides: fromGallery ? [] : overrides,
    today,
    keepRiftcodexIds: !fromGallery,
  });
  const current = await readCatalog(db);
  const plan = makePlan({
    desired,
    current,
    overrides,
    newId: randomUUID,
    source: fromGallery ? 'riot' : 'riftcodex',
  });
  const versionBefore = await readCatalogVersion(db);

  console.log(formatReport(desired.report, plan, apply ? 'apply' : 'dry run', source));
  console.log(`\nCatalog version now: ${versionBefore}`);
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify({ report: desired.report, plan }, null, 2));
    console.error(`Full plan written to ${reportPath}`);
  }

  if (plan.stops.length) return 1;
  if (!apply) {
    console.log('\nDry run — nothing was written. Re-run with --apply to write these changes.');
    return 0;
  }
  if (!hasChanges(plan)) {
    console.log('\nNothing to write; the catalog is up to date.');
    return 0;
  }
  const before = versionBefore;
  await applyPlan(db, plan);
  const after = await readCatalogVersion(db);
  console.log(`\nApplied. Catalog version ${before} → ${after}.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
