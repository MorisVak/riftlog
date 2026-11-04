/**
 * Riftcodex (https://api.riftcodex.com) — an open, unofficial Riftbound card
 * API. Only the importer talks to it; the apps read our own catalog.
 *
 * Every response is shape-checked: an unexpected shape stops the import
 * rather than writing half-understood data. Uses only `fetch`, so it runs
 * in Node and in a Deno Edge Function alike.
 */

export const RIFTCODEX_URL = 'https://api.riftcodex.com';

export type RiftcodexCard = {
  /** Riftcodex's own id — unique. (`riftbound_id` is not.) */
  id: string;
  name: string;
  /** `set-number[suffix]-setsize`, e.g. `unl-229*-219`, `ven-r03`. */
  riftbound_id: string;
  attributes: { energy: number | null; might: number | null; power: number | null };
  classification: {
    type: string;
    supertype: string | null;
    rarity: string | null;
    domain: string[];
  };
  /** `rich` is HTML (<p>, <br />, <ul>/<li>); `plain` is the same text with no line breaks. */
  text: { plain: string | null; rich: string | null };
  set: { set_id: string };
  media: { image_url: string | null; artist: string | null };
  tags: string[];
  orientation: string | null;
  metadata: { alternate_art: boolean; overnumbered: boolean; signature: boolean };
  /** True for an entry Riftcodex added recently — not the same as unreleased. */
  new: boolean;
};

export type RiftcodexSet = {
  set_id: string;
  name: string;
  /** ISO timestamp, e.g. `2026-07-31T00:00:00`. */
  published_on: string | null;
};

export class ShapeError extends Error {
  constructor(where: string, what: string) {
    super(`Unexpected source data at ${where}: ${what}`);
    this.name = 'ShapeError';
  }
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const field = (obj: Json, key: string, where: string): unknown => {
  if (!(key in obj)) throw new ShapeError(where, `missing "${key}"`);
  return obj[key];
};
const str = (obj: Json, key: string, where: string): string => {
  const v = field(obj, key, where);
  if (typeof v !== 'string') throw new ShapeError(where, `"${key}" is not a string`);
  return v;
};
const strOrNull = (obj: Json, key: string, where: string): string | null => {
  const v = obj[key];
  if (v == null) return null;
  if (typeof v !== 'string') throw new ShapeError(where, `"${key}" is not a string`);
  return v;
};
const numOrNull = (obj: Json, key: string, where: string): number | null => {
  const v = obj[key];
  if (v == null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ShapeError(where, `"${key}" is not a number`);
  return v;
};
const obj = (parent: Json, key: string, where: string): Json => {
  const v = field(parent, key, where);
  if (!isObject(v)) throw new ShapeError(where, `"${key}" is not an object`);
  return v;
};
const strings = (parent: Json, key: string, where: string): string[] => {
  const v = parent[key];
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    throw new ShapeError(where, `"${key}" is not a list of strings`);
  }
  return v as string[];
};

export const parseCard = (raw: unknown, where = 'card'): RiftcodexCard => {
  if (!isObject(raw)) throw new ShapeError(where, 'not an object');
  const id = str(raw, 'id', where);
  const at = `${where} ${id}`;
  const attributes = obj(raw, 'attributes', at);
  const classification = obj(raw, 'classification', at);
  const text = isObject(raw.text) ? raw.text : {};
  const media = isObject(raw.media) ? raw.media : {};
  const metadata = obj(raw, 'metadata', at);
  const flag = (key: string) => metadata[key] === true;
  return {
    id,
    name: str(raw, 'name', at),
    riftbound_id: str(raw, 'riftbound_id', at),
    attributes: {
      energy: numOrNull(attributes, 'energy', at),
      might: numOrNull(attributes, 'might', at),
      power: numOrNull(attributes, 'power', at),
    },
    classification: {
      type: str(classification, 'type', at),
      supertype: strOrNull(classification, 'supertype', at),
      rarity: strOrNull(classification, 'rarity', at),
      domain: strings(classification, 'domain', at),
    },
    text: { plain: strOrNull(text, 'plain', at), rich: strOrNull(text, 'rich', at) },
    set: { set_id: str(obj(raw, 'set', at), 'set_id', at) },
    media: {
      image_url: strOrNull(media, 'image_url', at),
      artist: strOrNull(media, 'artist', at),
    },
    tags: strings(raw, 'tags', at),
    orientation: strOrNull(raw, 'orientation', at),
    metadata: {
      alternate_art: flag('alternate_art'),
      overnumbered: flag('overnumbered'),
      signature: flag('signature'),
    },
    new: raw.new === true,
  };
};

export const parseSet = (raw: unknown, where = 'set'): RiftcodexSet => {
  if (!isObject(raw)) throw new ShapeError(where, 'not an object');
  return {
    set_id: str(raw, 'set_id', where),
    name: str(raw, 'name', where),
    published_on: strOrNull(raw, 'published_on', where),
  };
};

type Page = { items: unknown[]; total: number; pages: number };

const parsePage = (raw: unknown, where: string): Page => {
  if (!isObject(raw)) throw new ShapeError(where, 'not an object');
  const items = field(raw, 'items', where);
  const total = field(raw, 'total', where);
  const pages = field(raw, 'pages', where);
  if (!Array.isArray(items)) throw new ShapeError(where, '"items" is not a list');
  if (typeof total !== 'number' || typeof pages !== 'number') {
    throw new ShapeError(where, '"total" / "pages" are not numbers');
  }
  return { items, total, pages };
};

export type FetchOptions = {
  userAgent: string;
  /** Pause between requests, to go easy on a free community API. */
  delayMs?: number;
  retries?: number;
  /** Per request. */
  timeoutMs?: number;
  onProgress?: (message: string) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getJson = async (url: string, opts: FetchOptions): Promise<unknown> => {
  const retries = opts.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    try {
      // A stalled connection fails after timeoutMs and is retried, rather
      // than hanging the import.
      const res = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': opts.userAgent },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (res.ok) return await res.json();
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) throw new Error(`GET ${url} → HTTP ${res.status}`);
    } catch (error) {
      if (attempt >= retries) throw error;
    }
    await sleep(1000 * 2 ** attempt);
  }
};

const getAllPages = async (path: string, opts: FetchOptions): Promise<unknown[]> => {
  const items: unknown[] = [];
  let pages = 1;
  let total = 0;
  for (let page = 1; page <= pages; page++) {
    const parsed = parsePage(await getJson(`${RIFTCODEX_URL}${path}?page=${page}`, opts), `${path} page ${page}`);
    pages = parsed.pages;
    total = parsed.total;
    items.push(...parsed.items);
    opts.onProgress?.(`${path} page ${page}/${pages}`);
    if (page < pages) await sleep(opts.delayMs ?? 300);
  }
  if (items.length !== total) {
    throw new ShapeError(path, `got ${items.length} items, but the API reported ${total}`);
  }
  return items;
};

/** The raw responses: every item of /sets and /cards, unparsed. */
export type RiftcodexRaw = { sets: unknown[]; cards: unknown[] };

/** Fetches everything. Raw, so a snapshot can keep exactly what came back. */
export const fetchRiftcodexRaw = async (opts: FetchOptions): Promise<RiftcodexRaw> => {
  const sets = await getAllPages('/sets', opts);
  const cards = await getAllPages('/cards', opts);
  return { sets, cards };
};

/** Shape-checks raw responses (live or from a snapshot) into typed entries. */
export const parseRiftcodex = (raw: RiftcodexRaw): { cards: RiftcodexCard[]; sets: RiftcodexSet[] } => ({
  sets: raw.sets.map((s, i) => parseSet(s, `set #${i}`)),
  cards: raw.cards.map((c, i) => parseCard(c, `card #${i}`)),
});
