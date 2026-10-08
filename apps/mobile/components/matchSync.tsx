import { useEffect, useRef } from 'react';
import type { Match } from '@riftlog/core';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/contexts/authContext';
import { useMatch } from '@/contexts/matchContext';
import { syncCompletedMatch, flushOutbox } from '@/lib/sync';
import {
  clearInProgressMatch,
  loadInProgressMatch,
  saveInProgressMatch,
} from '@/lib/localStore';

/**
 * Offline-tolerant persistence orchestrator. Renders nothing; mounted once under
 * AuthProvider + MatchProvider in the root layout. There is no "match completed"
 * callback — completion is `match.endedAt` flipping non-null inside the
 * matchContext reducers — so all of this is driven by effects watching `match`.
 *
 * Local footprint is exactly two bounded items (see lib/localStore): the single
 * in-progress match and the outbox. History is never mirrored locally.
 *
 * **Everything here is gated on being signed in.** A guest's match is in-memory
 * only: no Postgres write, no in-progress mirror, no outbox entry. That's not a
 * restriction bolted on top — it's what keeps there being ONE data path. If a
 * guest match could reach the outbox it would upload under whichever account
 * signed in next, and we'd be back to writing merge logic.
 */
/**
 * What of a settled match can still change after it's saved: its notes (the
 * match-over screen lets you add them). A change here triggers a re-sync.
 */
const notesKey = (m: Match): string =>
  JSON.stringify([m.notes ?? null, m.games.map((g) => g.notes ?? null)]);

const MatchSync = () => {
  const { status } = useAuth();
  const { match, endMatch, resumeMatch } = useMatch();
  // Settled matches we've already handed off to sync — de-dupes across renders.
  const handledIds = useRef<Set<string>>(new Set());
  // The notes each handled match was last synced with, and one promise chain
  // for all completed-match writes. Chaining means a re-sync (notes added on
  // the match-over screen) can never be overtaken by the slower first save
  // and have its notes overwritten by the note-less upsert.
  const syncedNotes = useRef<Map<string, string>>(new Map());
  const writeChain = useRef<Promise<void>>(Promise.resolve());
  const enqueueWrite = (task: () => Promise<void>) => {
    writeChain.current = writeChain.current.then(task, task);
  };
  const prevStatus = useRef(status);
  // Matches this device saw while signed OUT. These are permanently
  // untouchable: they may never be mirrored, uploaded, or queued, no matter
  // what the auth state becomes afterwards.
  //
  // This has to be tracked by id rather than inferred from the current status,
  // because sign-in flips `status` and the write effect below in the SAME
  // commit — and the discard is a setState that hasn't landed yet. Without
  // this, signing in from the match-over screen would upload the guest's match
  // into the brand-new account: the exact merge we're refusing to do.
  const guestMatchIds = useRef<Set<string>>(new Set());

  const authed = status === 'authed';

  // On sign-in: DISCARD whatever the guest was playing. Not uploaded, not
  // merged, not resumed — the guest sandbox is disposable by design, and
  // migrating it is exactly the merge logic this feature exists to avoid.
  //
  // The local stores are cleared by signOut() on the way out, so the only
  // transition needing work here is guest -> authed.
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (was === 'guest' && status === 'authed') {
      endMatch();
      void clearInProgressMatch();
    }
  }, [status, endMatch]);

  // On launch (once signed in): rehydrate an interrupted in-progress match,
  // recover any settled match left behind by a crash, then flush the outbox.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    void (async () => {
      const stored = await loadInProgressMatch();
      if (!cancelled && stored) {
        if (stored.endedAt === null) {
          resumeMatch(stored);
        } else {
          handledIds.current.add(stored.id);
          await syncCompletedMatch(stored);
          await clearInProgressMatch();
        }
      }
      void flushOutbox();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Mirror the in-progress match on every change; on completion, upload-or-enqueue
  // and clear the in-progress slot. Depending on the whole `match` object keeps
  // the local mirror current as the round plays.
  useEffect(() => {
    // Guests write nothing, anywhere: no Postgres row, no in-progress mirror,
    // no outbox entry. Note this deliberately does NOT clear the in-progress
    // key on the guest path — sign-out already cleared it, and a signed-in
    // user's stored match must survive the app being reopened.
    if (!authed) {
      if (match) guestMatchIds.current.add(match.id);
      return;
    }

    if (!match) {
      void clearInProgressMatch();
      return;
    }
    // Started as a guest, so it stays a guest's. It's on its way to being
    // discarded; it must not touch storage on the way out.
    if (guestMatchIds.current.has(match.id)) return;

    if (match.endedAt === null) {
      void saveInProgressMatch(match);
      return;
    }
    if (handledIds.current.has(match.id)) {
      // Already saved. Notes added on the match-over screen arrive after that
      // first write — upsert again so they land (or replace the queued copy
      // in the outbox when offline; the outbox de-dupes by id).
      const key = notesKey(match);
      if (syncedNotes.current.get(match.id) !== key) {
        syncedNotes.current.set(match.id, key);
        enqueueWrite(() => syncCompletedMatch(match));
      }
      return;
    }
    handledIds.current.add(match.id);
    syncedNotes.current.set(match.id, notesKey(match));
    enqueueWrite(async () => {
      await syncCompletedMatch(match);
      await clearInProgressMatch();
    });
  }, [match, authed]);

  // Drain the outbox whenever connectivity returns or the app is foregrounded.
  useEffect(() => {
    if (!authed) return;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flushOutbox();
    });
    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void flushOutbox();
    });
    return () => {
      unsubscribeNet();
      appStateSub.remove();
    };
  }, [authed]);

  return null;
};

export default MatchSync;
