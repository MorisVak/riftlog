import { useEffect, useRef } from 'react';
import { useMatch } from '@/contexts/matchContext';
import { saveCompletedMatch } from '@/lib/matchPersistence';

/**
 * Persistence trigger. There is no "match completed" callback — completion is
 * `match.endedAt` flipping non-null inside the endGame/concludeMatch reducers —
 * so we watch that transition with an effect rather than a UI button.
 *
 * Renders nothing; mounted once under MatchProvider in the root layout. A ref
 * de-dupes so a settled match is written exactly once even across re-renders.
 * On failure (offline / not signed in) we just warn for now; the Slice 3 outbox
 * will enqueue and retry.
 */
const MatchSync = () => {
  const { match } = useMatch();
  const persistedIds = useRef<Set<string>>(new Set());

  const matchId = match?.id;
  const endedAt = match?.endedAt ?? null;

  useEffect(() => {
    if (!match || !endedAt) return;
    if (persistedIds.current.has(match.id)) return;

    persistedIds.current.add(match.id);
    saveCompletedMatch(match).catch((error) => {
      // Allow a later retry (foreground / next completion) once the outbox lands.
      persistedIds.current.delete(match.id);
      console.warn('[MatchSync] failed to persist completed match', error);
    });
    // `match` is intentionally read fresh; the id/endedAt pair gates the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, endedAt]);

  return null;
};

export default MatchSync;
