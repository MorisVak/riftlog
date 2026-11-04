/**
 * Copies card art into our `card-images` bucket, so the app serves every card
 * image from our own storage.
 *
 *   pnpm catalog:images                 dry run: what would be copied, writes nothing
 *   pnpm catalog:images --apply         copy and mark the printings as self-hosted
 *   pnpm catalog:images --apply --limit 5
 *                                       a trial batch
 *
 * Picks printings with an `image_url` and no `storage_path`, downloads each
 * image twice (full and small WebP), uploads both, then sets `storage_path`.
 * Resumable: run it again and it continues where it stopped; files already in
 * the bucket are kept. Uses the secret key from supabase/.env.
 */
import { createClient } from '@supabase/supabase-js';
import { cardImagePath, smallCardImagePath, type Database } from '@riftlog/core';
import { readAll } from './apply';
import { loadEnv } from './env';
import { downloadUrls } from './images';

const BUCKET = 'card-images';
const USER_AGENT = 'Riftlog catalog importer (https://www.riftlog.net, support@riftlog.net)';
const PARALLEL = 2;
const PAUSE_MS = 150;
const CHUNK = 200;

type Printing = Database['public']['Tables']['card_printings']['Row'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string): Promise<Uint8Array> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/webp')) throw new Error(`not a WebP (${type})`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (error) {
      if (attempt >= 2) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

async function main(): Promise<number> {
  let apply = false;
  let limit = Infinity;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') apply = true;
    else if (args[i] === '--limit' && args[i + 1]) limit = Number(args[++i]);
    else {
      console.error(`Unknown argument: ${args[i]}\nUsage: catalog:images [--apply] [--limit N]`);
      return 2;
    }
  }

  const env = loadEnv();
  const db = createClient<Database>(env.url, env.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const printings = await readAll(db, 'card_printings', 'code');
  const todo = printings.filter((p) => p.image_url && !p.storage_path && !p.manually_edited);
  const notResizable = todo.filter((p) => !downloadUrls(p.image_url ?? '').full);
  const batch = todo.filter((p) => downloadUrls(p.image_url ?? '').full).slice(0, limit);

  console.log(`Card art — ${apply ? 'apply' : 'dry run'}`);
  console.log(`  printings              ${printings.length}`);
  console.log(`  already self-hosted    ${printings.filter((p) => p.storage_path).length}`);
  console.log(`  to copy                ${todo.length - notResizable.length}${batch.length < todo.length - notResizable.length ? ` (this run: ${batch.length})` : ''}`);
  console.log(`  can't copy (not on Riot's card CDN) ${notResizable.length}${notResizable.length ? `: ${notResizable.slice(0, 10).map((p) => p.code).join(', ')}` : ''}`);
  console.log(`  estimated size         ~${Math.round((batch.length * 100) / 1024)} MB (≈ 80 KB full + 17 KB small each)`);
  if (!apply) {
    console.log('\nDry run — nothing was copied. Re-run with --apply.');
    return 0;
  }

  const storage = db.storage.from(BUCKET);
  const upload = async (path: string, bytes: Uint8Array): Promise<'uploaded' | 'existed'> => {
    const { error } = await storage.upload(path, bytes, { contentType: 'image/webp', upsert: false });
    if (!error) return 'uploaded';
    if (/exists|duplicate/i.test(error.message)) return 'existed';
    throw new Error(`upload ${path}: ${error.message}`);
  };

  const done: Printing[] = [];
  const failed: { code: string; error: string }[] = [];
  let bytes = 0;
  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const p = batch[next++];
      if (!p) break;
      try {
        const urls = downloadUrls(p.image_url ?? '');
        const path = cardImagePath(p.code);
        const full = await download(urls.full ?? '');
        const small = await download(urls.small ?? '');
        await upload(path, full);
        await upload(smallCardImagePath(path), small);
        bytes += full.length + small.length;
        done.push({ ...p, storage_path: path });
        process.stderr.write(`\r  copied ${done.length}/${batch.length}      `);
      } catch (error) {
        failed.push({ code: p.code, error: error instanceof Error ? error.message : String(error) });
        if (failed.length >= 10 && done.length === 0) throw new Error('10 failures and no success — stopping.');
      }
      await sleep(PAUSE_MS);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  process.stderr.write('\n');

  // Mark them self-hosted, a chunk at a time (whole rows, so one statement each).
  for (let i = 0; i < done.length; i += CHUNK) {
    const rows = done.slice(i, i + CHUNK).map(({ created_at: _c, updated_at: _u, ...row }) => row);
    const { error } = await db.from('card_printings').upsert(rows, { onConflict: 'code' });
    if (error) throw new Error(`marking printings self-hosted: ${error.message}`);
  }

  console.log(`\nCopied ${done.length} printings (${(bytes / 1024 / 1024).toFixed(1)} MB), failed ${failed.length}.`);
  for (const f of failed.slice(0, 20)) console.log(`  ${f.code}: ${f.error}`);
  return failed.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
