import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HistoryRowVM, Result } from '@/lib/historyView';
import VersusBanner from '@/components/match/versusBanner';
import PressOverlay from '@/components/pressOverlay';

const TITLE: Record<Result, string> = { win: 'Victory', loss: 'Defeat', draw: 'Draw' };
const TITLE_CLASS: Record<Result, string> = {
  win: 'text-win-text',
  loss: 'text-loss-text',
  draw: 'text-draw-text',
};

const CARD_H = 108;

/**
 * Home's last match, in the versus-banner look of the match screens: your
 * legend against theirs, the loser dimmed, the result over the score — and,
 * in the corner, when it was played. Tap to open the match.
 */
const LastMatchCard = ({ vm, onOpen }: { vm: HistoryRowVM; onOpen: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Last match, ${vm.date}: ${TITLE[vm.result]}, ${vm.score}, against ${vm.opponent}. Open match`}
    onPress={onOpen}
    className="relative overflow-hidden rounded-2xl border border-border"
  >
    {({ pressed }) => (
      <>
        <VersusBanner
          you={{ name: vm.you, legend: vm.yourLegend }}
          them={{ name: vm.opponent, legend: vm.opponentLegend }}
          outcome={vm.result}
          title={TITLE[vm.result]}
          titleClass={TITLE_CLASS[vm.result]}
          score={vm.score}
          height={CARD_H}
          accessibilityLabel=""
        />
        <View className="absolute left-3 top-2.5 rounded-full bg-background/75 px-2 py-0.5">
          <Text className="font-display text-[11px] text-ink-secondary">
            Last match · {vm.date} · {vm.format}
          </Text>
        </View>
        <PressOverlay pressed={pressed} />
      </>
    )}
  </Pressable>
);

export default LastMatchCard;
