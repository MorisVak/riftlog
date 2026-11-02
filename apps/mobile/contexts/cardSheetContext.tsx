import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CardRef } from '@riftlog/core';
import CardSheet from '@/components/deck/cardSheet';

/**
 * One card details sheet for the whole app: any row, tile or identity card
 * calls `openCard(card)` instead of mounting its own modal.
 */

type CardSheetContextType = { openCard: (card: CardRef) => void };

const CardSheetContext = createContext<CardSheetContextType | null>(null);

const CardSheetProvider = ({ children }: { children: React.ReactNode }) => {
  const [card, setCard] = useState<CardRef | null>(null);
  const openCard = useCallback((c: CardRef) => setCard(c), []);
  const value = useMemo(() => ({ openCard }), [openCard]);
  return (
    <CardSheetContext.Provider value={value}>
      {children}
      <CardSheet card={card} onClose={() => setCard(null)} />
    </CardSheetContext.Provider>
  );
};

export const useCardSheet = (): CardSheetContextType => {
  const ctx = useContext(CardSheetContext);
  if (!ctx) throw new Error('useCardSheet must be used inside CardSheetProvider');
  return ctx;
};

export default CardSheetProvider;
