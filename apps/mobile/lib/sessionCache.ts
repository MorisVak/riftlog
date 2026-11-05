import { useSyncExternalStore } from 'react';
import { fetchMatchHistory, type MatchListRow } from './matchPersistence';
import { fetchMyDecks, type Deck } from './decks';

/**
 * A server read kept **in memory for this session** — never written to the
 * device (Postgres stays the only store; see "Persistence architecture").
 * Screens show what was read last at once and refresh it quietly in the
 * background on focus. A refresh that returns the same data keeps the old
 * objects, so nothing downstream re-renders (memoized rows keep their props).
 * Cleared when the signed-in account changes (`clearSessionCaches`).
 *
 * Why: History and Home re-read every match on every tab switch (300–500 ms
 * on the network) and, with fresh objects each time, redrew every row.
 */
type Snapshot<T> = { data: T | null; error: string | null };

export type SessionResource<T> = {
  /** Re-read from the server (shared if one is already in flight). */
  refresh: () => Promise<void>;
  /** Change the data in place, e.g. an optimistic delete (and its undo). */
  update: (fn: (cur: T | null) => T | null) => void;
  clear: () => void;
  /** Subscribe / read, for the hooks below (useSyncExternalStore). */
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Snapshot<T>;
};

/**
 * For lists of `{ id }` rows: a fresh list that reuses the previous row
 * object wherever that row hasn't changed — so after a refresh that adds one
 * match, only that row is new and the other rows don't redraw.
 */
function shareRows<T>(prev: T | null, next: T): T {
  if (!Array.isArray(prev) || !Array.isArray(next)) return next;
  const old = new Map<unknown, { json: string; row: unknown }>();
  for (const row of prev) {
    if (row && typeof row === 'object' && 'id' in row) {
      old.set(row.id, { json: JSON.stringify(row), row });
    }
  }
  return next.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('id' in row)) return row;
    const hit = old.get(row.id);
    return hit && hit.json === JSON.stringify(row) ? hit.row : row;
  }) as T;
}

function createResource<T>(fetcher: () => Promise<T>): SessionResource<T> {
  let snapshot: Snapshot<T> = { data: null, error: null };
  // The last data as JSON: an unchanged refresh is detected and skipped.
  let key = '';
  let inFlight: Promise<void> | null = null;
  // Bumped by clear(): a read started for the previous account is dropped.
  let generation = 0;
  const listeners = new Set<() => void>();
  const set = (next: Snapshot<T>) => {
    snapshot = next;
    listeners.forEach((l) => l());
  };

  const refresh = () => {
    if (inFlight) return inFlight;
    const gen = generation;
    inFlight = fetcher()
      .then((data) => {
        if (gen !== generation) return;
        const nextKey = JSON.stringify(data);
        // Unchanged: keep the objects already on screen (no re-render).
        if (nextKey === key && snapshot.error === null) return;
        key = nextKey;
        set({ data: shareRows(snapshot.data, data), error: null });
      })
      .catch((e: unknown) => {
        if (gen !== generation) return;
        // With data already on screen, a failed refresh keeps it (offline).
        if (snapshot.data !== null) return;
        set({ data: null, error: e instanceof Error ? e.message : 'Failed to load' });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    refresh,
    update: (fn) => {
      const data = fn(snapshot.data);
      key = JSON.stringify(data);
      set({ data, error: null });
    },
    clear: () => {
      generation += 1;
      key = '';
      inFlight = null;
      set({ data: null, error: null });
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getSnapshot: () => snapshot,
  };
}

/** Your matches, newest first, as History and Home read them. */
export const matchHistoryCache = createResource<MatchListRow[]>(fetchMatchHistory);

/** Your decks (not archived), as the Decks tab, Home, Profile and the picker read them. */
export const myDecksCache = createResource<Deck[]>(fetchMyDecks);

// Named hooks, not a `.use()` method: the React Compiler treats a call named
// `use` like React's `use()` (allowed in conditions) and may skip it on some
// renders, which broke the order of hooks.

/** Your matches (and a first-load error), re-rendering when they change. */
export function useMatchHistory(): Snapshot<MatchListRow[]> {
  return useSyncExternalStore(matchHistoryCache.subscribe, matchHistoryCache.getSnapshot);
}

/** Your decks (and a first-load error), re-rendering when they change. */
export function useMyDecks(): Snapshot<Deck[]> {
  return useSyncExternalStore(myDecksCache.subscribe, myDecksCache.getSnapshot);
}

/** On sign-out or an account switch: nothing read for one account outlives it. */
export function clearSessionCaches() {
  matchHistoryCache.clear();
  myDecksCache.clear();
}

