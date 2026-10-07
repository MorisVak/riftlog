import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { DetailGameVM, TimelineRowVM } from '@/lib/matchDetailView';
import Icon from '@/components/icon';

// Result tokens — the same win / loss / draw families as History. An
// unfinished game (the match was ended early) gets neutral ink.
const TONE: Record<
  DetailGameVM['result'],
  { fill: string; badge: string; text: string }
> = {
  win: { fill: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { fill: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { fill: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
  unfinished: {
    fill: 'bg-border',
    badge: 'bg-elevated',
    text: 'text-ink-tertiary',
  },
};

// How a point was taken — the board's own conquer / hold / special colors.
const DOT: Record<TimelineRowVM['kind'], string> = {
  conquer: 'bg-conquer',
  hold: 'bg-hold',
  special: 'bg-special',
  correction: 'bg-ink-tertiary',
};

/**
 * One game on the match detail: "Game n", your score, a bar filled to your
 * share of the points (in the result color), their score, and the W/L/D badge
 * (letter + color, never color alone). Tap to expand the point timeline when
 * the game has one.
 */
const GameCard = ({ game }: { game: DetailGameVM }) => {
  const [open, setOpen] = useState(false);
  const tone = TONE[game.result];
  const hasTimeline = game.timeline.length > 0;
  const won = game.result === 'win';
  const lost = game.result === 'loss';

  const toggle = () => {
    if (!hasTimeline) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Pressable
        onPress={toggle}
        disabled={!hasTimeline}
        accessibilityRole={hasTimeline ? 'button' : undefined}
        accessibilityState={hasTimeline ? { expanded: open } : undefined}
        accessibilityLabel={`Game ${game.n}, ${game.you} to ${game.them}, ${
          game.result === 'unfinished' ? 'unfinished' : game.result
        }${hasTimeline ? ', show point timeline' : ''}`}
        className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-elevated"
      >
        <Text className="w-10 font-display text-[12px] leading-4 text-ink-secondary">
          {`Game\n${game.n}`}
        </Text>
        <Text
          className={`w-7 text-right font-mono text-[18px] ${
            won ? 'text-ink-primary' : 'text-ink-secondary'
          }`}
        >
          {game.you}
        </Text>
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
          <View
            className={`h-full rounded-full ${tone.fill}`}
            style={{ width: `${Math.round(game.share * 100)}%` }}
          />
        </View>
        <Text
          className={`w-7 font-mono text-[18px] ${
            lost ? 'text-ink-primary' : 'text-ink-secondary'
          }`}
        >
          {game.them}
        </Text>
        <View
          className={`h-7 w-7 items-center justify-center rounded-md ${tone.badge}`}
        >
          {game.letter ? (
            <Text className={`font-display-bold text-[12px] ${tone.text}`}>
              {game.letter}
            </Text>
          ) : (
            <Icon name="minus" size={12} className="text-ink-tertiary" />
          )}
        </View>
        {hasTimeline && (
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            className="text-ink-secondary"
          />
        )}
      </Pressable>

      {open && (
        <Animated.View
          entering={FadeIn.duration(180)}
          className="border-t border-border/60 px-4 pb-3 pt-2"
        >
          {game.timeline.map((row, i) => (
            <TimelineRow
              key={row.key}
              row={row}
              first={i === 0}
              last={i === game.timeline.length - 1}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
};

/**
 * One point on the timeline: game time · a dot on a vertical line (colored by
 * how it was scored) · who and how · the running score.
 */
const TimelineRow = ({
  row,
  first,
  last,
}: {
  row: TimelineRowVM;
  first: boolean;
  last: boolean;
}) => (
  <View
    accessible
    accessibilityLabel={`${row.time}, ${row.who}, ${row.label}, score ${row.score}`}
    className="min-h-[34px] flex-row items-center gap-3"
  >
    <Text className="w-11 font-mono-medium text-[12px] text-ink-tertiary">
      {row.time}
    </Text>
    <View className="w-3 items-center self-stretch">
      <View
        className={`w-px flex-1 ${first ? 'bg-transparent' : 'bg-border'}`}
      />
      <View className={`h-2.5 w-2.5 rounded-full ${DOT[row.kind]}`} />
      <View
        className={`w-px flex-1 ${last ? 'bg-transparent' : 'bg-border'}`}
      />
    </View>
    <Text
      className={`flex-1 text-[14px] ${
        row.kind === 'correction'
          ? 'text-ink-tertiary'
          : row.mine
            ? 'font-display text-ink-primary'
            : 'text-ink-secondary'
      }`}
      numberOfLines={1}
    >
      {row.who} · {row.label}
    </Text>
    <Text className="font-mono-medium text-[13px] text-ink-primary">
      {row.score}
    </Text>
  </View>
);

export default GameCard;
