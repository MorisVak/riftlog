import {
  buildCatalogIndex,
  type CardRef,
  type CatalogCard,
  type CatalogIndex,
  type DeckList,
  type Player,
  type PointEvent,
} from '@riftlog/core';
import { readCachedCatalog } from './catalog';
import { fetchMyDecksLive, type Deck, type DeckVersion } from './decks';
import type { GameRow, MatchWithGames } from './matchPersistence';

/**
 * DEMO MODE — a made-up, varied history for screenshots and recordings
 * (the website), so they don't show the owner's real matches.
 *
 * Dev builds only, and only with `EXPO_PUBLIC_DEMO=1` when Metro starts:
 *   EXPO_PUBLIC_DEMO=1 pnpm exec expo start --dev-client --clear
 * Then matches, decks and the default deck come from here instead of
 * Postgres, and every write (saving a match, notes, deck edits, deletes) is
 * skipped — nothing reaches the database. Sign-in and the profile stay real.
 *
 * One deck is real: the owner's Riven deck (read from their account, never
 * changed), the demo's default deck — a real list for the deck screenshots.
 * The rest is generated from the card catalog cached on the device (real
 * cards), with a fixed seed, so it's the same on every run: four more decks
 * and a month of matches across all five, against fictional opponents
 * (first names — nothing to blur) and every kind of legend.
 */
export const DEMO = __DEV__ && process.env.EXPO_PUBLIC_DEMO === '1';

/** Deterministic randomness (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const uuid = (kind: number, n: number) =>
  `00000000-0000-4000-8${kind}00-${String(n).padStart(12, '0')}`;

/** Generated decks (the real Riven deck comes first, weight 4). */
const DECKS: { name: string; legend: string; weight: number }[] = [
  { name: 'Ahri Control', legend: 'Ahri - Nine-Tailed Fox', weight: 3 },
  { name: 'Jinx Aggro', legend: 'Jinx - Loose Cannon', weight: 3 },
  { name: "Kai'Sa Tempo", legend: "Kai'Sa - Daughter of the Void", weight: 2 },
  { name: 'Darius Midrange', legend: 'Darius - Hand of Noxus', weight: 2 },
];
const REAL_WEIGHT = 4;

const OPPONENTS = [
  'Alex',
  'Mara',
  'Jonas',
  'Lea',
  'Tobi',
  'Noah',
  'Sophie',
  'Finn',
  'Ida',
  'Emil',
  'Nora',
  'Ben',
];

const NOTES = [
  'Mulliganed too greedy, ran out of gas.',
  'Held the battlefield the whole game. Great matchup.',
  'Should have kept a hold up for their turn.',
  'Close one — one conquer short.',
];

type DemoData = { decks: Deck[]; versions: Map<string, DeckVersion[]>; matches: MatchWithGames[] };

let data: Promise<DemoData> | null = null;

/** The demo world, generated once per session. */
function demo(): Promise<DemoData> {
  data ??= (async () => {
    const catalog = await readCachedCatalog();
    if (!catalog) throw new Error('Demo mode needs the card catalog: open the app online once.');
    // The owner's Riven deck (the most recently edited one), as it is.
    const real = (await fetchMyDecksLive()).find((d) => d.list.legend?.name.startsWith('Riven'));
    return generate(buildCatalogIndex(catalog), real ?? null);
  })();
  return data;
}

function generate(index: CatalogIndex, real: Deck | null): DemoData {
  const r = rng(20261105);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
  const cards = [...index.cardById.values()];
  const ref = (c: CatalogCard, count = 1): CardRef => ({
    name: c.name,
    code: index.basePrinting.get(c.id)?.code ?? null,
    count,
  });
  const byName = (name: string) => cards.find((c) => c.name === name);
  const inDomains = (c: CatalogCard, domains: string[]) =>
    c.domains.length > 0 && c.domains.every((d) => domains.includes(d));

  // ---- Decks --------------------------------------------------------------
  const now = Date.now();
  const decks: Deck[] = [];
  const weights: number[] = [];
  const versions = new Map<string, DeckVersion[]>();
  if (real) {
    decks.push(real);
    weights.push(REAL_WEIGHT);
    versions.set(real.id, [{ id: real.versionId, list: real.list, createdAt: real.updatedAt }]);
  }
  DECKS.forEach((spec, i) => {
    const legend = byName(spec.legend);
    if (!legend) return;
    const domains = legend.domains;
    const tag = legend.tags[0];
    const champion = cards.find(
      (c) => c.type === 'Unit' && c.supertype === 'Champion' && tag && c.tags.includes(tag),
    );
    const pool = cards.filter(
      (c) =>
        ['Unit', 'Spell', 'Gear'].includes(c.type) &&
        c.supertype !== 'Champion' &&
        c.supertype !== 'Token' &&
        inDomains(c, domains) &&
        index.basePrinting.has(c.id),
    );
    const chosen: CatalogCard[] = [];
    while (chosen.length < 15 && chosen.length < pool.length) {
      const c = pick(pool);
      if (!chosen.includes(c)) chosen.push(c);
    }
    // 9 × 3 + 6 × 2 = 39, plus the chosen champion = the 40-card main deck.
    const main = chosen.map((c, k) => ref(c, k < 9 ? 3 : 2));
    const runeCards = domains
      .map((d) => cards.find((c) => c.type === 'Rune' && c.domains[0] === d))
      .filter((c): c is CatalogCard => !!c);
    const runes = runeCards.map((c, k) => ref(c, k === 0 ? 7 : 5));
    const bfs: CatalogCard[] = [];
    const bfPool = cards.filter((c) => c.type === 'Battlefield' && index.basePrinting.has(c.id));
    while (bfs.length < 3) {
      const c = pick(bfPool);
      if (!bfs.includes(c)) bfs.push(c);
    }
    const list: DeckList = {
      legend: ref(legend),
      champion: champion ? ref(champion) : null,
      main,
      battlefields: bfs.map((c) => ref(c)),
      runes,
      sideboard: [],
      additionalLegends: [],
    };
    const id = uuid(1, i + 1);
    const created = new Date(now - (40 - i * 3) * DAY).toISOString();
    const updated = new Date(now - (6 + i * 2) * DAY).toISOString();
    const deckVersions: DeckVersion[] = [];
    // One generated deck has an earlier version: "Show changes" has something to show.
    if (i === 0 && main.length > 2) {
      const older: DeckList = {
        ...list,
        main: list.main.map((c, k) => (k === 1 ? { ...c, count: 1 } : c)).slice(0, -1),
      };
      deckVersions.push({ id: uuid(2, 100 + i), list: older, createdAt: created });
    }
    deckVersions.push({
      id: uuid(2, i + 1),
      list,
      createdAt: deckVersions.length ? updated : created,
    });
    versions.set(id, deckVersions);
    weights.push(spec.weight);
    decks.push({
      id,
      name: spec.name,
      importSource: i % 2 === 0 ? 'piltover_code' : 'text',
      sourceCode: null,
      versionId: deckVersions[deckVersions.length - 1]!.id,
      list,
      createdAt: created,
      updatedAt: updated,
    });
  });

  // ---- Matches ------------------------------------------------------------
  const legends = cards.filter((c) => c.type === 'Legend' && index.basePrinting.has(c.id));
  const weighted = decks.flatMap((d, i) => Array(weights[i] ?? 1).fill(d) as Deck[]);
  const matches: MatchWithGames[] = [];
  let at = now - 2 * 3_600_000;
  for (let m = 0; m < 30; m++) {
    const deck = pick(weighted);
    const theirs = pick(legends.filter((l) => l.name !== deck.list.legend?.name));
    const bestOf = r() < 0.45 ? 3 : 1;
    const won = r() < 0.62;
    const timed = r() < 0.3;
    // The games, from your side: W / L sequence for a Bo3, one game for a Bo1.
    const sequence: ('p1' | 'p2')[] =
      bestOf === 1
        ? [won ? 'p1' : 'p2']
        : (
            pick([
              ['w', 'w'],
              ['w', 'l', 'w'],
              ['l', 'w', 'w'],
            ]) as string[]
          ).map((x) => ((x === 'w') === won ? 'p1' : 'p2'));
    const matchId = uuid(3, m + 1);
    const games: GameRow[] = [];
    let start = at - sequence.length * 22 * 60_000;
    const matchStart = start;
    sequence.forEach((winner, g) => {
      const loserScore = 3 + Math.floor(r() * 5);
      const want = { p1: winner === 'p1' ? 8 : loserScore, p2: winner === 'p2' ? 8 : loserScore };
      const events: PointEvent[] = [];
      const score = { p1: 0, p2: 0 };
      let t = 0;
      while (score.p1 < want.p1 || score.p2 < want.p2) {
        // The winner's last point comes last.
        const canP1 =
          score.p1 < want.p1 &&
          !(winner === 'p1' && score.p1 === want.p1 - 1 && score.p2 < want.p2);
        const canP2 =
          score.p2 < want.p2 &&
          !(winner === 'p2' && score.p2 === want.p2 - 1 && score.p1 < want.p1);
        const who: 'p1' | 'p2' = canP1 && (!canP2 || r() < 0.5) ? 'p1' : 'p2';
        t += 25_000 + Math.floor(r() * 70_000);
        const roll = r();
        events.push({
          atMs: t,
          playerId: who,
          delta: 1,
          action: roll < 0.45 ? 'conquer' : roll < 0.9 ? 'hold' : 'special',
        });
        score[who] += 1;
        // Now and then a mis-tap, taken back.
        if (r() < 0.04) {
          events.push({ atMs: t + 4000, playerId: who, delta: 1, action: 'conquer' });
          events.push({ atMs: t + 9000, playerId: who, delta: -1, action: null });
          t += 9000;
        }
      }
      const ended = start + t + 60_000;
      games.push({
        id: uuid(4, (m + 1) * 10 + g),
        match_id: matchId,
        user_id: 'demo',
        game_index: g,
        scores_at_end: want,
        winner_id: winner,
        started_at: new Date(start).toISOString(),
        ended_at: new Date(ended).toISOString(),
        events,
        notes: null,
        created_at: new Date(ended).toISOString(),
      });
      start = ended + 3 * 60_000;
    });
    const w1 = sequence.filter((s) => s === 'p1').length;
    const w2 = sequence.length - w1;
    const players: Player[] = [
      {
        id: 'p1',
        userId: null,
        name: 'You',
        gameScore: 0,
        gameWins: w1,
        xp: 0,
        legend: deck.list.legend ?? undefined,
      },
      {
        id: 'p2',
        userId: null,
        name: pick(OPPONENTS),
        gameScore: 0,
        gameWins: w2,
        xp: 0,
        legend: ref(theirs),
      },
    ];
    const ended = games[games.length - 1]!.ended_at!;
    matches.push({
      id: matchId,
      user_id: 'demo',
      best_of: bestOf,
      winner_id: w1 > w2 ? 'p1' : w2 > w1 ? 'p2' : null,
      players: players as unknown as MatchWithGames['players'],
      started_at: new Date(matchStart).toISOString(),
      ended_at: ended,
      time_limit_seconds: timed ? 50 * 60 : null,
      clock_paused_ms: 0,
      deck_version_id: deck.versionId,
      host_user_id: null,
      guest_user_ids: [],
      notes: r() < 0.2 ? pick(NOTES) : null,
      created_at: ended,
      games,
      deck: {
        id: deck.id,
        name: deck.name,
        archivedAt: null,
        versionId: deck.versionId,
        edited: false,
        legend: deck.list.legend,
        currentLegend: deck.list.legend,
      },
    });
    // Sessions: a few matches close together, then a day or two off.
    at -= r() < 0.6 ? 70 * 60_000 : (1 + Math.floor(r() * 2)) * DAY;
  }
  return { decks, versions, matches };
}

// ---- What the data layer calls in demo mode ---------------------------------

export const demoMatches = async () => (await demo()).matches;
export const demoMatch = async (id: string) =>
  (await demo()).matches.find((m) => m.id === id) ?? null;
export const demoDecks = async () => (await demo()).decks;
export const demoDeck = async (id: string) => (await demo()).decks.find((d) => d.id === id) ?? null;
export const demoDeckVersions = async (id: string) => (await demo()).versions.get(id) ?? [];
/** The default deck in demo mode: the real Riven deck (else the first generated one). */
export const demoDefaultDeckId = async () => (await demo()).decks[0]?.id ?? null;
