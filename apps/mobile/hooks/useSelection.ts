import { useCallback, useMemo, useState } from 'react';

/**
 * Multi-select state for a list — WhatsApp-style: enter selection mode (a
 * "Select" button, or long-pressing a row, which selects that row), tap rows
 * to toggle them, then act on the selection. Ids only; the screen owns the
 * rows and decides what an action does with them.
 *
 * Shared by History and "My decks". Actions live in the screen's
 * `SelectionBar` (`components/selectionBar.tsx`), so adding one — e.g.
 * "Move to folder" — doesn't touch this hook.
 */
export type Selection = {
  /** Selection mode is on. Rows tap to toggle; swipe actions are off. */
  active: boolean;
  selected: ReadonlySet<string>;
  count: number;
  isSelected: (id: string) => boolean;
  /** Enter selection mode, optionally with one row already selected. */
  start: (id?: string) => void;
  /** Toggle a row; enters selection mode first if it's off. */
  toggle: (id: string) => void;
  /** Deselect everything but stay in selection mode (e.g. filter change). */
  clearSelected: () => void;
  /** Leave selection mode. */
  exit: () => void;
};

export function useSelection(): Selection {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const start = useCallback((id?: string) => {
    setActive(true);
    setSelected(id ? new Set([id]) : new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setActive(true);
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => setSelected(new Set()), []);

  const exit = useCallback(() => {
    setActive(false);
    setSelected(new Set());
  }, []);

  return useMemo(
    () => ({
      active,
      selected,
      count: selected.size,
      isSelected: (id: string) => selected.has(id),
      start,
      toggle,
      clearSelected,
      exit,
    }),
    [active, selected, start, toggle, clearSelected, exit],
  );
}
