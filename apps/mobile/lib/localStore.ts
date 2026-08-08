import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Match } from '@riftlog/core';

/**
 * Bounded, self-clearing local store for offline tolerance. Postgres is the
 * single source of truth; the device persists EXACTLY two things and nothing
 * more — match history is never mirrored locally.
 *
 *   1. the single in-progress match (so an interrupted round survives a
 *      kill/restart), and
 *   2. an outbox of completed-but-unsynced matches (flushed on reconnect).
 *
 * Both clear themselves: the in-progress key is removed when the match ends or
 * is discarded; outbox entries are removed once confirmed in Postgres. These
 * two keys are the only match data this app writes to disk.
 *
 * (The Supabase auth session is stored separately by LargeSecureStore; that's
 * the session, not match data.)
 */
const KEYS = {
  inProgress: 'riftlog.inProgressMatch',
  outbox: 'riftlog.outbox',
} as const;

// ---- in-progress match -----------------------------------------------------

export async function saveInProgressMatch(match: Match): Promise<void> {
  await AsyncStorage.setItem(KEYS.inProgress, JSON.stringify(match));
}

export async function loadInProgressMatch(): Promise<Match | null> {
  const raw = await AsyncStorage.getItem(KEYS.inProgress);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Match;
  } catch {
    // Corrupt entry — drop it rather than wedge the app.
    await AsyncStorage.removeItem(KEYS.inProgress);
    return null;
  }
}

export async function clearInProgressMatch(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.inProgress);
}

// ---- outbox (completed-but-unsynced) ---------------------------------------

export async function getOutbox(): Promise<Match[]> {
  const raw = await AsyncStorage.getItem(KEYS.outbox);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Match[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await AsyncStorage.removeItem(KEYS.outbox);
    return [];
  }
}

/** Append a completed match, de-duped by id (writes are idempotent upserts). */
export async function enqueueOutbox(match: Match): Promise<void> {
  const current = await getOutbox();
  const next = [...current.filter((m) => m.id !== match.id), match];
  await AsyncStorage.setItem(KEYS.outbox, JSON.stringify(next));
}

/**
 * Drop the whole queue. Called on sign-out: outbox entries carry NO user_id —
 * `matches.user_id` defaults from `auth.uid()` at insert time — so a match
 * queued by one account and flushed while another is signed in would be
 * written to the wrong user. The queue is only ever valid for the session that
 * filled it.
 */
export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.outbox);
}

export async function removeFromOutbox(matchId: string): Promise<void> {
  const current = await getOutbox();
  const next = current.filter((m) => m.id !== matchId);
  if (next.length === 0) {
    await AsyncStorage.removeItem(KEYS.outbox);
  } else {
    await AsyncStorage.setItem(KEYS.outbox, JSON.stringify(next));
  }
}
