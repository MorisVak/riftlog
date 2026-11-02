/**
 * The importer's credentials, read from supabase/.env (gitignored). Only the
 * two values it needs are read, and the secret key is never printed.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENV_FILE = fileURLToPath(new URL('../../../supabase/.env', import.meta.url));

export type ImporterEnv = { url: string; secretKey: string };

export function loadEnv(path = ENV_FILE): ImporterEnv {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Can't read ${path}. It must hold SUPABASE_URL and SUPABASE_SECRET_KEY.`);
  }
  const values = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m?.[1]) values.set(m[1], (m[2] ?? '').replace(/^(['"])(.*)\1$/, '$2'));
  }
  const url = values.get('SUPABASE_URL');
  const secretKey = values.get('SUPABASE_SECRET_KEY');
  if (!url?.startsWith('https://')) throw new Error('SUPABASE_URL is missing or not https in supabase/.env');
  if (!secretKey?.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY in supabase/.env is missing or is not a secret key (sb_secret_…)');
  }
  return { url, secretKey };
}
