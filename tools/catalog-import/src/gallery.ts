/**
 * Riot's official card gallery (https://playriftbound.com/en-us/card-gallery/).
 * The page embeds its whole card database as JSON (`__NEXT_DATA__`), so one
 * page load is the entire source — there's no separate API.
 *
 * Entries are mapped onto the Riftcodex entry shape, so the same transform,
 * plan, safety stops and report run on them. Used for sets Riftcodex doesn't
 * have yet (Radiance); rows are written as `source = 'riot'`.
 *
 * Pure: no I/O — the caller fetches the page or reads a saved copy.
 */
import { ShapeError, type RiftcodexCard, type RiftcodexSet } from './riftcodex';

export const GALLERY_URL = 'https://playriftbound.com/en-us/card-gallery/';

/**
 * Release dates the gallery doesn't carry. A set without one counts as
 * unreleased (spoiler), so add a set here when importing it.
 */
const RELEASE_DATES: Record<string, string> = {
  RAD: '2026-10-23',
};

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const at = (v: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((cur, key) => (isObject(cur) ? cur[key] : undefined), v);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The card items embedded in the gallery page's HTML. */
export function parseGalleryHtml(html: string): unknown[] {
  const match = /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) throw new ShapeError('gallery page', 'no __NEXT_DATA__ block');
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new ShapeError('gallery page', '__NEXT_DATA__ is not JSON');
  }
  const blades = at(data, 'props', 'pageProps', 'page', 'blades');
  if (!Array.isArray(blades)) throw new ShapeError('gallery page', 'no page blades');
  for (const blade of blades) {
    const items = at(blade, 'cards', 'items');
    if (Array.isArray(items) && items.length > 0) return items;
  }
  throw new ShapeError('gallery page', 'no blade with cards');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `rad-043-167` / `sfd-227-star-221` → Riftcodex-style ids (`-star` → `*`). */
const toRiftboundId = (id: string) => id.replace(/-star(?=-|$)/, '*');

/** Ability text plus, for equipment, its separate "Effect" text. */
const richText = (item: Json): string | null => {
  const parts = [at(item, 'text', 'richText', 'body'), at(item, 'effect', 'richText', 'body')]
    .map(str)
    .filter((p): p is string => p !== null);
  return parts.length ? parts.join('') : null;
};

function toEntry(raw: unknown, index: number): RiftcodexCard {
  const where = `gallery item #${index}`;
  if (!isObject(raw)) throw new ShapeError(where, 'not an object');
  const id = str(raw.id);
  const baseName = str(raw.name);
  const setId = str(at(raw, 'set', 'value', 'id'));
  if (!id || !baseName || !setId) throw new ShapeError(`${where} ${String(raw.id)}`, 'missing id, name or set');
  // Riot's data leaves the type list empty on a few cards; the image's
  // accessibility text still starts with it ("Riftbound Spell: Hush. …").
  // With neither, the type stays '' and the transform skips the card.
  const types = at(raw, 'cardType', 'type');
  const fromList = Array.isArray(types) && isObject(types[0]) ? str(types[0].label) : null;
  const fromAlt = /^Riftbound (Legend|Unit|Spell|Gear|Battlefield|Rune)\b/.exec(
    str(at(raw, 'cardImage', 'accessibilityText')) ?? '',
  )?.[1];
  const type = fromList ?? fromAlt ?? '';
  const superTypes = at(raw, 'cardType', 'superType');
  const supertype = Array.isArray(superTypes) && isObject(superTypes[0]) ? str(superTypes[0].label) : null;
  const tags = at(raw, 'tags', 'tags');
  const tagList = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  // Legends are titled ("The Exile") with the champion only in the tags;
  // everything else is name + subtitle ("Riven" / "Broken Blade").
  const subtitle = str(raw.subtitle);
  const champion = tagList.at(-1);
  const name =
    type === 'Legend' && champion
      ? `${champion} - ${baseName}`
      : subtitle
        ? `${baseName} - ${subtitle}`
        : baseName;

  const domainValues = at(raw, 'domain', 'values');
  const domains = (Array.isArray(domainValues) ? domainValues : [])
    .map((d) => str(at(d, 'id')))
    .filter((d): d is string => d !== null)
    .map(capitalize);

  const artists = at(raw, 'illustrator', 'values');
  const riftboundId = toRiftboundId(id);
  return {
    id,
    name,
    riftbound_id: riftboundId,
    attributes: {
      energy: num(at(raw, 'energy', 'value', 'id')),
      might: num(at(raw, 'might', 'value', 'id')),
      power: num(at(raw, 'power', 'value', 'id')),
    },
    classification: {
      type,
      supertype,
      rarity: str(at(raw, 'rarity', 'value', 'label')),
      domain: domains,
    },
    text: { plain: null, rich: richText(raw) },
    set: { set_id: setId.toUpperCase() },
    media: {
      image_url: str(at(raw, 'cardImage', 'url')),
      artist: Array.isArray(artists) ? str(at(artists[0], 'label')) : null,
    },
    tags: tagList,
    orientation: str(raw.orientation),
    metadata: {
      // `rad-149a-167`, `rad-r01a`: the `a` printing is the alternate art.
      alternate_art: /^[a-z]+-(?:r|sp)?\d+a(?:-|$)/.test(id),
      // Overnumbered is derived from the number by the transform.
      overnumbered: false,
      signature: riftboundId.includes('*'),
    },
    new: false,
  };
}

/**
 * Gallery items as Riftcodex-shaped entries, and the sets they belong to —
 * limited to `onlySets` when given.
 */
export function galleryToEntries(
  items: unknown[],
  opts: { onlySets?: string[] } = {},
): { cards: RiftcodexCard[]; sets: RiftcodexSet[] } {
  const wanted = opts.onlySets?.map((s) => s.toUpperCase());
  const inScope = (raw: unknown) => {
    const id = str(at(raw, 'set', 'value', 'id'))?.toUpperCase();
    return !wanted || (id !== undefined && wanted.includes(id));
  };
  const cards = items.map((raw, i) => (inScope(raw) ? toEntry(raw, i) : null)).filter((c): c is RiftcodexCard => c !== null);
  const setNames = new Map<string, string>();
  items.forEach((raw) => {
    const id = str(at(raw, 'set', 'value', 'id'))?.toUpperCase();
    const label = str(at(raw, 'set', 'value', 'label'));
    if (id && label && (!wanted || wanted.includes(id))) setNames.set(id, label);
  });
  const sets: RiftcodexSet[] = [...setNames].map(([set_id, name]) => ({
    set_id,
    name,
    published_on: RELEASE_DATES[set_id] ?? null,
  }));
  return { cards, sets };
}
