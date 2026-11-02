import { useMemo } from 'react';
import { checkDeckList, type DeckCheck, type DeckList } from '@riftlog/core';
import { useCatalog } from '@/contexts/catalogContext';

/**
 * A whole deck against the catalog: how many cards to flag, for the summary
 * under the deck. Null while there's no catalog yet.
 */
export function useDeckCheck(list: DeckList): DeckCheck | null {
  const { index } = useCatalog();
  return useMemo(() => (index ? checkDeckList(list, index) : null), [index, list]);
}
