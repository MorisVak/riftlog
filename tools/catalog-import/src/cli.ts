/**
 * Seeds / syncs the card catalog from Riftcodex.
 *
 *   pnpm catalog:import                    dry run: fetch, compare, report — writes nothing
 *   pnpm catalog:import --apply            write the reported changes to the database
 *   pnpm catalog:import --report out.json  also save the full plan as JSON
 *   pnpm catalog:import --from-snapshot <file>
 *                                          use a saved Riftcodex snapshot instead of fetching
 *
 * Every successful live fetch is saved to .cache/ (gitignored) as a snapshot.
 *
 * Uses the secret key from supabase/.env. Never run this from an app.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@riftlog/core';
import { applyPlan, readCatalog, readCatalogVersion } from './apply';
import { loadEnv } from './env';
import { parseOverrides } from './overrides';
import { hasChanges, makePlan } from './plan';
import { formatReport } from './report';
import { fetchRiftcodexRaw, parseRiftcodex, type RiftcodexRaw } from './riftcodex';
import { loadSnapshot, saveSnapshot, type SourceInfo } from './snapshot';
import { transform } from './transform';

// pnpm runs scripts from the package folder; resolve paths from where the
// command was typed (INIT_CWD) so repo-root-relative paths work.
const fromCaller = (path: string): string => resolve(process.env.INIT_CWD ?? process.cwd(), path);

const USER_AGENT = 'Riftlog catalog importer (https://www.riftlog.net, support@riftlog.net)';

async function main(): Promise<number> {
  let apply = false;
  let reportPath: string | undefined;
  let snapshotPath: string | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--report' && args[i + 1]) reportPath = fromCaller(args[++i] ?? '');
    else if (arg === '--from-snapshot' && args[i + 1]) snapshotPath = fromCaller(args[++i] ?? '');
    else {
      console.error(
        `Unknown argument: ${arg}\nUsage: catalog:import [--apply] [--report <file.json>] [--from-snapshot <file.json>]`,
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

  let raw: RiftcodexRaw;
  let source: SourceInfo;
  if (snapshotPath) {
    const snapshot = loadSnapshot(snapshotPath);
    raw = snapshot;
    source = { kind: 'snapshot', fetchedAt: snapshot.fetched_at, path: snapshotPath };
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
    source = { kind: 'live', fetchedAt: fetchedAt.toISOString(), path: saved };
  }

  const today = new Date().toISOString().slice(0, 10);
  const desired = transform({ ...parseRiftcodex(raw), overrides, today });
  const current = await readCatalog(db);
  const plan = makePlan({ desired, current, overrides, newId: randomUUID });
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
