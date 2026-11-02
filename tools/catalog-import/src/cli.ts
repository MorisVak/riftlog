/**
 * Seeds / syncs the card catalog from Riftcodex.
 *
 *   pnpm catalog:import                    dry run: fetch, compare, report — writes nothing
 *   pnpm catalog:import --apply            write the reported changes to the database
 *   pnpm catalog:import --report out.json  also save the full plan as JSON
 *
 * Uses the secret key from supabase/.env. Never run this from an app.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@riftlog/core';
import { applyPlan, readCatalog, readCatalogVersion } from './apply';
import { loadEnv } from './env';
import { parseOverrides } from './overrides';
import { hasChanges, makePlan } from './plan';
import { formatReport } from './report';
import { fetchRiftcodex } from './riftcodex';
import { transform } from './transform';

const USER_AGENT = 'Riftlog catalog importer (https://www.riftlog.net, support@riftlog.net)';

async function main(): Promise<number> {
  let apply = false;
  let reportPath: string | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--report' && args[i + 1]) reportPath = args[++i];
    else {
      console.error(`Unknown argument: ${arg}\nUsage: catalog:import [--apply] [--report <file.json>]`);
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

  console.error('Fetching Riftcodex…');
  const source = await fetchRiftcodex({
    userAgent: USER_AGENT,
    onProgress: (m) => process.stderr.write(`\r  ${m}      `),
  });
  process.stderr.write('\n');

  const today = new Date().toISOString().slice(0, 10);
  const desired = transform({ ...source, overrides, today });
  const current = await readCatalog(db);
  const plan = makePlan({ desired, current, overrides, newId: randomUUID });

  console.log(formatReport(desired.report, plan, apply ? 'apply' : 'dry run'));
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
  const before = await readCatalogVersion(db);
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
