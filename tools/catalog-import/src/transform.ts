/**
 * Riftcodex data + our overrides → the catalog rows we want. Pure: no I/O,
 * no Node APIs, so it can move into an Edge Function unchanged.
 */
import {
  baseCardName,
  cleanCardText,
  collectorNumber,
  deckCodeSetId,
  normalizeCardName,
  parsePrintingCode,
  type Database,
} from '@riftlog/core';
import type { RiftcodexCard, RiftcodexSet } from './riftcodex';

type Enums = Database['public']['Enums'];
export type CardType = Enums['card_type'];
export type CatalogStatus = Enums['catalog_status'];

const CARD_TYPES = {
  Legend: true,
  Unit: true,
  Spell: true,
  Gear: true,
  Battlefield: true,
  Rune: true,
} satisfies Record<CardType, true>;
const isCardType = (t: string): t is CardType => Object.hasOwn(CARD_TYPES, t);

const DOMAINS = new Set(['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order', 'Colorless']);

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

export const OVERRIDE_FIELDS = [
  'code',
  'name',
  'type',
  'supertype',
  'domains',
  'text',
  'image_url',
  'orientation',
  'status',
  'overnumbered',
  'skip',
] as const;
export type OverrideField = (typeof OVERRIDE_FIELDS)[number];

/** One correction to a Riftcodex entry. Same shape as a `catalog_overrides` row. */
export type Override = {
  riftcodex_id: string;
  field: OverrideField;
  value: unknown;
  note: string | null;
};

// ---------------------------------------------------------------------------
// Desired rows (column names match the tables)
// ---------------------------------------------------------------------------

export type DesiredSet = {
  code: string;
  name: string;
  released_on: string | null;
  deck_code_set_id: number | null;
  status: CatalogStatus;
};

export type DesiredCard = {
  name_key: string;
  name: string;
  type: CardType;
  supertype: string | null;
  domains: string[];
  energy: number | null;
  might: number | null;
  power: number | null;
  tags: string[];
  current_text: string;
  status: CatalogStatus;
};

export type DesiredPrinting = {
  code: string;
  /** The card it belongs to, by match key; resolved to `card_id` by the plan. */
  name_key: string;
  set_code: string;
  collector_number: string;
  variant: string;
  alt_art: boolean;
  overnumbered: boolean;
  signed: boolean;
  promo: boolean;
  printed_text: string;
  image_url: string | null;
  artist: string | null;
  rarity: string | null;
  orientation: 'portrait' | 'landscape';
  riftcodex_id: string;
  status: CatalogStatus;
};

export type SourceRef = { riftcodex_id: string; riftbound_id: string; name: string };

export type TransformReport = {
  fetched: number;
  /** Spoiler-era duplicates dropped because a released twin exists. */
  droppedTwins: SourceRef[];
  skipped: (SourceRef & { reason: string })[];
  overridesApplied: Override[];
  /** Overrides whose Riftcodex id matched no entry (stale or mistyped). */
  overridesUnused: Override[];
  /** Names with both ", " and " - " — usually a source error worth an override. */
  suspiciousNames: SourceRef[];
  /** Two entries that map to one code. Stops the import. */
  duplicateCodes: { code: string; entries: SourceRef[] }[];
  /** One name key carrying different card types. Stops the import. */
  typeConflicts: { name_key: string; types: string[] }[];
};

export type Desired = {
  sets: DesiredSet[];
  cards: DesiredCard[];
  printings: DesiredPrinting[];
  report: TransformReport;
};

// ---------------------------------------------------------------------------

const ref = (c: RiftcodexCard): SourceRef => ({
  riftcodex_id: c.id,
  riftbound_id: c.riftbound_id,
  name: c.name,
});

/** `2026-07-31T00:00:00` → `2026-07-31`. */
const isoDate = (value: string | null): string | null =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

/** A set with no release date, or one after `today`, is unreleased: spoilers. */
const statusFor = (releasedOn: string | null, today: string): CatalogStatus =>
  releasedOn === null || releasedOn > today ? 'spoiler' : 'released';

type Mapped = {
  printing: DesiredPrinting;
  card: Omit<DesiredCard, 'name_key' | 'status'>;
  /** Number within the printed set size (R / SP numbers always are). */
  withinSize: boolean;
  setReleasedOn: string | null;
  source: RiftcodexCard;
};

export function transform(input: {
  cards: RiftcodexCard[];
  sets: RiftcodexSet[];
  overrides: Override[];
  /** YYYY-MM-DD; sets released after it are spoilers. */
  today: string;
}): Desired {
  const report: TransformReport = {
    fetched: input.cards.length,
    droppedTwins: [],
    skipped: [],
    overridesApplied: [],
    overridesUnused: [],
    suspiciousNames: [],
    duplicateCodes: [],
    typeConflicts: [],
  };

  // Sets.
  const sets: DesiredSet[] = input.sets.map((s) => {
    const released_on = isoDate(s.published_on);
    return {
      code: s.set_id,
      name: s.name.trim(),
      released_on,
      deck_code_set_id: deckCodeSetId(s.set_id),
      status: statusFor(released_on, input.today),
    };
  });
  const setByCode = new Map(sets.map((s) => [s.code, s]));

  // A promo's riftbound_id ends in its parent set's size (opp-086-221 reprints
  // SFD-086). Learn each deckable set's size from its own entries.
  const sizeVotes = new Map<string, Map<string, number>>();
  for (const c of input.cards) {
    const size = c.riftbound_id.split('-')[2];
    if (size === undefined || !/^\d+$/.test(size) || deckCodeSetId(c.set.set_id) === null) continue;
    const votes = sizeVotes.get(size) ?? new Map<string, number>();
    votes.set(c.set.set_id, (votes.get(c.set.set_id) ?? 0) + 1);
    sizeVotes.set(size, votes);
  }
  const parentBySize = new Map<string, string>();
  for (const [size, votes] of sizeVotes) {
    const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) parentBySize.set(size, top[0]);
  }

  // 1. Drop spoiler-era twins: an entry marked new when a non-new entry shares
  //    its riftbound_id.
  const byRid = new Map<string, RiftcodexCard[]>();
  for (const c of input.cards) {
    const group = byRid.get(c.riftbound_id) ?? [];
    group.push(c);
    byRid.set(c.riftbound_id, group);
  }
  const entries: RiftcodexCard[] = [];
  for (const group of byRid.values()) {
    const hasReleased = group.some((c) => !c.new);
    for (const c of group) {
      if (group.length > 1 && hasReleased && c.new) report.droppedTwins.push(ref(c));
      else entries.push(c);
    }
  }

  // 2. Overrides, by Riftcodex id.
  const overridesById = new Map<string, Override[]>();
  for (const o of input.overrides) {
    const list = overridesById.get(o.riftcodex_id) ?? [];
    list.push(o);
    overridesById.set(o.riftcodex_id, list);
  }
  const seenIds = new Set(input.cards.map((c) => c.id));
  report.overridesUnused = input.overrides.filter((o) => !seenIds.has(o.riftcodex_id));

  // 3. Map each entry to a printing.
  const mapped: Mapped[] = [];
  for (const original of entries) {
    const overrides = overridesById.get(original.id) ?? [];
    const get = (f: OverrideField) => overrides.find((o) => o.field === f);
    const skip = (reason: string) => report.skipped.push({ ...ref(original), reason });

    if (get('skip')?.value === true) {
      report.overridesApplied.push(get('skip') as Override);
      skip('override: skip');
      continue;
    }

    const name = (get('name')?.value as string | undefined) ?? original.name;
    const type = (get('type')?.value as string | undefined) ?? original.classification.type;
    const supertype =
      get('supertype') !== undefined
        ? (get('supertype')?.value as string | null)
        : original.classification.supertype;
    const domains = (get('domains')?.value as string[] | undefined) ?? original.classification.domain;
    const text = get('text') !== undefined ? (get('text')?.value as string) : original.text.plain;
    const imageUrl =
      get('image_url') !== undefined ? (get('image_url')?.value as string | null) : original.media.image_url;
    const orientation = (get('orientation')?.value as string | undefined) ?? original.orientation;

    // The code: from an override, else from riftbound_id (set-number[suffix]-size).
    const ridParts = original.riftbound_id.split('-');
    let parts = null as ReturnType<typeof parsePrintingCode>;
    const codeOverride = get('code')?.value;
    if (typeof codeOverride === 'string') {
      parts = parsePrintingCode(codeOverride);
      if (!parts) {
        skip(`override code "${codeOverride}" is not a printing code`);
        continue;
      }
    } else {
      const number = /^(r|sp)?(\d+)([a-z*]?)$/.exec(ridParts[1] ?? '');
      if (!number || ridParts[0] !== original.set.set_id.toLowerCase()) {
        skip(`no printing code for "${original.riftbound_id}" (token or unknown shape)`);
        continue;
      }
      // Promo sets aren't deckable and reuse their parent set's numbers.
      let parent = '';
      if (deckCodeSetId(original.set.set_id) === null) {
        const found = parentBySize.get(ridParts[2] ?? '');
        if (!found) {
          skip(`promo "${original.riftbound_id}": can't tell which set it reprints`);
          continue;
        }
        parent = `${found}-`;
      }
      parts = parsePrintingCode(
        `${original.set.set_id}-${parent}${(number[1] ?? '').toUpperCase()}${number[2]}${number[3]}`,
      );
      if (!parts) {
        skip(`"${original.riftbound_id}" doesn't map to a valid printing code`);
        continue;
      }
    }

    const set = setByCode.get(parts.set);
    if (!set) {
      skip(`unknown set ${parts.set}`);
      continue;
    }
    if (!isCardType(type)) {
      skip(`unknown card type "${type}"`);
      continue;
    }
    const badDomain = domains.find((d) => !DOMAINS.has(d));
    if (badDomain !== undefined) {
      skip(`unknown domain "${badDomain}"`);
      continue;
    }
    const { energy, might, power } = original.attributes;
    if ([energy, might, power].some((v) => v !== null && (v < 0 || !Number.isInteger(v)))) {
      skip('negative or fractional energy / might / power');
      continue;
    }

    if (set.deck_code_set_id !== null && parts.parent !== null) {
      skip(`${parts.set} is deckable, so its code can't name a parent set`);
      continue;
    }

    for (const o of overrides) report.overridesApplied.push(o);

    const size = /^\d+$/.test(ridParts[2] ?? '') ? Number(ridParts[2]) : null;
    const plainNumber = /^\d+$/.test(parts.number) ? Number(parts.number) : null;
    const withinSize = plainNumber === null || size === null || plainNumber <= size;
    const name_key = normalizeCardName(name);
    const status =
      (get('status')?.value as CatalogStatus | undefined) ?? statusFor(set.released_on, input.today);

    mapped.push({
      printing: {
        code: `${parts.set}-${collectorNumber(parts)}${parts.variant}`,
        name_key,
        set_code: parts.set,
        collector_number: collectorNumber(parts),
        variant: parts.variant,
        alt_art: original.metadata.alternate_art,
        overnumbered: (get('overnumbered')?.value as boolean | undefined) ?? original.metadata.overnumbered,
        signed: original.metadata.signature || parts.variant === '*',
        promo: set.deck_code_set_id === null,
        printed_text: cleanCardText(text),
        image_url: imageUrl && imageUrl.startsWith('https://') ? imageUrl : null,
        artist: original.media.artist,
        rarity: original.classification.rarity,
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        riftcodex_id: original.id,
        status,
      },
      card: {
        name: baseCardName(name),
        type,
        supertype,
        domains,
        energy,
        might,
        power,
        tags: original.tags,
        current_text: cleanCardText(text),
      },
      withinSize,
      setReleasedOn: set.released_on,
      source: original,
    });

    const shown = baseCardName(name);
    if (shown.includes(', ') && shown.includes(' - ')) {
      report.suspiciousNames.push({ ...ref(original), name });
    }
  }

  // Duplicate codes stop the import.
  const byCode = new Map<string, Mapped[]>();
  for (const m of mapped) {
    const list = byCode.get(m.printing.code) ?? [];
    list.push(m);
    byCode.set(m.printing.code, list);
  }
  for (const [code, list] of byCode) {
    if (list.length > 1) report.duplicateCodes.push({ code, entries: list.map((m) => ref(m.source)) });
  }

  // 4. Group into cards; the base printing decides the card's fields.
  const byKey = new Map<string, Mapped[]>();
  for (const m of mapped) {
    const list = byKey.get(m.printing.name_key) ?? [];
    list.push(m);
    byKey.set(m.printing.name_key, list);
  }
  const cards: DesiredCard[] = [];
  for (const [name_key, group] of byKey) {
    const types = [...new Set(group.map((m) => m.card.type))];
    if (types.length > 1) report.typeConflicts.push({ name_key, types });
    const base = pickBasePrinting(group);
    cards.push({ name_key, ...base.card, status: base.printing.status });
  }

  return {
    sets,
    cards,
    printings: mapped.map((m) => m.printing),
    report,
  };
}

/** Main sets rank first, then OGS (starter), then promo sets. */
const tier = (m: Mapped): number => {
  if (m.printing.promo) return 2;
  return m.printing.set_code === 'OGS' ? 1 : 0;
};

const isPlainBase = (m: Mapped): boolean =>
  m.printing.variant === '' &&
  !m.printing.alt_art &&
  !m.printing.overnumbered &&
  !m.printing.signed &&
  m.withinSize;

/**
 * The printing a card takes its fields and text from: a released one over a
 * spoiler; then main set, OGS, promo; then a plain base printing (no variant,
 * not overnumbered); then the most recently released set (a reprint may carry
 * newer wording); then the lowest code, for a stable result.
 */
function pickBasePrinting<T extends Mapped>(group: T[]): T {
  const sorted = [...group].sort(
    (a, b) =>
      Number(a.printing.status !== 'released') - Number(b.printing.status !== 'released') ||
      tier(a) - tier(b) ||
      Number(!isPlainBase(a)) - Number(!isPlainBase(b)) ||
      (b.setReleasedOn ?? '').localeCompare(a.setReleasedOn ?? '') ||
      a.printing.code.localeCompare(b.printing.code),
  );
  return sorted[0] as T;
}
