import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HistoryRowVM, Result } from '@/lib/historyView';
import MatchMeta from './matchMeta';
import { MatchBackdrop } from './deck/cardArt';
import PressOverlay from './pressOverlay';

// Result tokens, paired with a letter + left bar so color is never the only
// signal (colorblind-safe rule). A trimmed copy of the map in `historyRow.tsx`
// — that row is the heavier swipe/expand variant for the History tab; this is
// the lightweight, tap-only preview row used on Home.
const RESULT: Record<Result, { bar: string; badge: string; text: string }> = {
  win: { bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
};

type Props = {
  vm: HistoryRowVM;
  onPress: () => void;
};

/**
 * Compact, read-only match row for the Home "Recent matches" preview. It mirrors
 * the History tab's row — same "vs {opponent}" title and the same meta line
 * (format, plus the clock for a timed match) — minus the swipe-to-delete and the
 * expandable per-game detail. Tapping opens the History tab with this match
 * already expanded. Score color always rides alongside the letter badge and
 * left bar. Your legend is the row's backdrop (`MatchBackdrop`, tinted with
 * the result); the text and the score sit on dark pills over it.
 */
const RecentMatchRow = ({ vm, onPress }: Props) => {
  const r = RESULT[vm.result];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="relative flex-row overflow-hidden rounded-xl border border-border bg-surface"
    >
      {({ pressed }) => (
        <>
          <MatchBackdrop legend={vm.yourLegend} tint={vm.result} />
          <View className={`w-1 self-stretch ${r.bar}`} />
          <View className="min-h-[64px] flex-1 flex-row items-center px-3 py-2">
            <View
              className={`h-8 w-8 items-center justify-center rounded-lg ${r.badge}`}
            >
              <Text className={`font-display-bold text-[13px] ${r.text}`}>
                {vm.letter}
              </Text>
            </View>

            <View className="ml-3 flex-1">
              {/* A soft dark pill hugging the text over the legend art. */}
              <View
                className={
                  vm.yourLegend
                    ? 'max-w-full self-start rounded-lg bg-background/55 px-2 py-1'
                    : ''
                }
              >
                {/* "vs" prefix, same as the History row: the name is the opponent. */}
                <Text
                  className="font-display text-[15px] font-semibold text-ink-primary"
                  numberOfLines={1}
                >
                  <Text className="font-normal text-ink-secondary">vs </Text>
                  {vm.opponent}
                  {vm.opponentChampion && (
                    <Text className="font-normal text-ink-secondary">
                      {' · '}
                      {vm.opponentChampion}
                    </Text>
                  )}
                </Text>
                <MatchMeta vm={vm} />
              </View>
            </View>

            <View
              className={`items-end ${
                vm.yourLegend
                  ? 'rounded-md bg-background/70 px-1.5 py-0.5'
                  : ''
              }`}
            >
              <Text className="font-mono text-[14px] text-ink-primary">
                {vm.score}
              </Text>
              <Text className="mt-0.5 text-[11px] text-ink-secondary">{vm.date}</Text>
            </View>
          </View>
          <PressOverlay pressed={pressed} />
        </>
      )}
    </Pressable>
  );
};

export default RecentMatchRow;
