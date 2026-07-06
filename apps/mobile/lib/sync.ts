import type { Match } from '@riftlog/core';
import { saveCompletedMatch } from './matchPersistence';
import { enqueueOutbox, getOutbox, removeFromOutbox } from './localStore';

/**
 * Offline-tolerant write + flush. Postgres is the source of truth; the outbox is
 * just a retry buffer for completed matches that couldn't upload yet.
 */

/**
 * Persist a settled match: try Postgres first, fall back to the outbox. On a
 * successful direct write we also drain any backlog, so the outbox trends empty
 * whenever we're online.
 */
export async function syncCompletedMatch(match: Match): Promise<void> {
  try {
    await saveCompletedMatch(match);
    void flushOutbox();
  } catch {
    await enqueueOutbox(match);
  }
}

// A single in-flight flush at a time — reconnect, foreground, and post-write can
// all fire near-simultaneously.
let flushing = false;

/**
 * Upload every queued match, removing each from the outbox on confirmed upload.
 * Idempotent (writes are upserts by id). Stops on the first failure so we don't
 * spin while offline; the next trigger retries. Safe to call freely.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queued = await getOutbox();
    for (const match of queued) {
      try {
        await saveCompletedMatch(match);
        await removeFromOutbox(match.id);
      } catch {
        // Still offline / write failing — stop and let a later trigger retry.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
