import { useMemo } from 'react';
import { cardIssue, matchCard, type CardIssue, type CardMatch, type CardRef, type ListSection } from '@riftlog/core';
import { useCatalog } from '@/contexts/catalogContext';

/**
 * A deck card's catalog match (by code, else by name), and — given its
 * section — the problem to flag, if any. Both null while there's no catalog
 * yet (first launch offline): the card then shows as written, unflagged.
 */
export function useCardMatch(
  card: Pick<CardRef, 'name' | 'code'>,
  section?: ListSection,
): { match: CardMatch | null; issue: CardIssue | null } {
  const { index } = useCatalog();
  return useMemo(() => {
    if (!index) return { match: null, issue: null };
    const match = matchCard(card, index);
    return { match, issue: section ? cardIssue(match, section) : null };
  }, [index, card.name, card.code, section]);
}
