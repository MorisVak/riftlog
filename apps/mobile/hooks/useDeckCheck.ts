import { useMemo } from 'react';
import { checkDeckList, matchCard, type DeckCheck, type DeckList } from '@riftlog/core';
import { useCatalog } from '@/contexts/catalogContext';
import { CARD_ART } from '@/lib/featureFlags';

/**
 * A whole deck against the catalog: how many cards to flag (for the summary
 * under the deck) and whether any card art is on screen (which brings the
 * Riot disclaimer with it). Null check while there's no catalog yet.
 */
export function useDeckCheck(list: DeckList): { check: DeckCheck | null; showsArt: boolean } {
  const { index } = useCatalog();
  return useMemo(() => {
    if (!index) return { check: null, showsArt: false };
    const all = [
      list.legend,
      list.champion,
      ...list.main,
      ...list.battlefields,
      ...list.runes,
      ...list.sideboard,
      ...list.additionalLegends,
    ];
    const showsArt =
      CARD_ART &&
      all.some((card) => {
        if (!card) return false;
        const m = matchCard(card, index);
        return m.kind !== 'unknown' && m.printing !== null && (m.printing.image_url !== null || m.printing.storage_path !== null);
      });
    return { check: checkDeckList(list, index), showsArt };
  }, [index, list]);
}
