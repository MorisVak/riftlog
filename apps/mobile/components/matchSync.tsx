import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useMatch } from '@/contexts/matchContext';
import { syncCompletedMatch, flushOutbox } from '@/lib/sync';
import {
  clearInProgressMatch,
  loadInProgressMatch,
  saveInProgressMatch,
} from '@/lib/localStore';

/**
 * Offline-tolerant persistence orchestrator. Renders nothing; mounted once under
 * MatchProvider in the root layout. There is no "match completed" callback —
 * completion is `match.endedAt` flipping non-null inside the matchContext
 * reducers — so all of this is driven by effects watching `match`.
 *
 * Local footprint is exactly two bounded items (see lib/localStore): the single
 * in-progress match and the outbox. History is never mirrored locally.
 */
const MatchSync = () => {
  const { match, resumeMatch } = useMatch();
  // Settled matches we've already handed off to sync — de-dupes across renders.
  const handledIds = useRef<Set<string>>(new Set());

  // On launch: rehydrate an interrupted in-progress match, recover any settled
  // match left behind by a crash, then flush the outbox. Runs once.
  useEffect(() => {
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
  }, []);

  // Mirror the in-progress match on every change; on completion, upload-or-enqueue
  // and clear the in-progress slot. Depending on the whole `match` object keeps
  // the local mirror current as the round plays.
  useEffect(() => {
    if (!match) {
      void clearInProgressMatch();
      return;
    }
    if (match.endedAt === null) {
      void saveInProgressMatch(match);
      return;
    }
    if (handledIds.current.has(match.id)) return;
    handledIds.current.add(match.id);
    void (async () => {
      await syncCompletedMatch(match);
      await clearInProgressMatch();
    })();
  }, [match]);

  // Drain the outbox whenever connectivity returns or the app is foregrounded.
  useEffect(() => {
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
  }, []);

  return null;
};

export default MatchSync;
