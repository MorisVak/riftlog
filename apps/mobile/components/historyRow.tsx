import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { deckHref, type HistoryRowVM, type Result } from '@/lib/historyView';
import MatchMeta from './matchMeta';
import { SelectionGutter } from './selectCheck';

// Result tokens, paired with a letter + left bar so color is never the only
// signal (colorblind-safe rule).
const RESULT: Record<Result, { bar: string; badge: string; text: string }> = {
  win: { bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
};

const INK_SECONDARY = '#868FB0';
const INK_PRIMARY = '#E4E5F2';
const ACCENT = '#8B93D9';

// Separates the two names in the expanded detail, matching the score chips.
const EN_DASH = '–';

// Expand/collapse share one timing window so the result bar, the detail height,
// and the chevron all move together — no half-collapsed "cut off" bar.
const EXPAND_MS = 240;
const EXPAND_EASING = Easing.inOut(Easing.cubic);

// Swipe-left distance that fully reveals the delete action sitting behind the
// card (matches the w-20 trash button).
const ACTION_W = 80;
const SWIPE_MS = 180;

const GameChip = ({ n, label, letter, result }: HistoryRowVM['games'][number]) => {
  const r = RESULT[result];
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-border bg-elevated px-2.5 py-1.5">
      <Text className="font-display text-[10px] text-ink-secondary">G{n}</Text>
      <Text className="font-mono text-xs text-ink-primary">{label}</Text>
      <View className={`h-4 w-4 items-center justify-center rounded ${r.badge}`}>
        <Text className={`font-display-bold text-[10px] ${r.text}`}>{letter}</Text>
      </View>
    </View>
  );
};

type Props = {
  vm: HistoryRowVM;
  index: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  /** Selection mode (see hooks/useSelection): taps toggle, swipe is off. */
  selecting?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** Long-press enters selection mode with this row selected. */
  onLongPress?: (id: string) => void;
};

const HistoryRow = ({
  vm,
  index,
  expanded,
  onToggle,
  onDelete,
  selecting = false,
  selected = false,
  onSelect,
  onLongPress,
}: Props) => {
  const r = RESULT[vm.result];
  const router = useRouter();

  // Natural height of the detail block, measured once from the always-mounted
  // (but clipped) content so we can animate the container height to/from it.
  const [detailH, setDetailH] = useState(0);

  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: EXPAND_MS,
      easing: EXPAND_EASING,
    });
  }, [expanded, progress]);

  // Animating `height` (a layout prop) re-lays out the row each frame, so the
  // self-stretch result bar tracks the growing/shrinking card in lockstep.
  const detailStyle = useAnimatedStyle(() => ({
    height: detailH * progress.value,
    opacity: progress.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  // Swipe-left to reveal the delete action that sits *behind* the card.
  const [open, setOpen] = useState(false);
  const tx = useSharedValue(0);
  const startTx = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const close = () => {
    tx.value = withTiming(0, { duration: SWIPE_MS });
    setOpen(false);
  };

  // Entering selection mode shuts a swiped-open row.
  useEffect(() => {
    if (selecting) {
      tx.value = withTiming(0, { duration: SWIPE_MS });
      setOpen(false);
    }
  }, [selecting, tx]);

  const pan = Gesture.Pan()
    .enabled(!selecting)
    .activeOffsetX([-12, 12]) // horizontal drag activates; taps/scroll pass through
    .failOffsetY([-12, 12])
    .onStart(() => {
      startTx.value = tx.value;
    })
    .onUpdate((e) => {
      tx.value = Math.min(0, Math.max(-ACTION_W, startTx.value + e.translationX));
    })
    .onEnd((e) => {
      const shouldOpen = tx.value < -ACTION_W / 2 || e.velocityX < -600;
      tx.value = withTiming(shouldOpen ? -ACTION_W : 0, { duration: SWIPE_MS });
      runOnJS(setOpen)(shouldOpen);
    });

  // Selecting: a tap toggles the row. Otherwise tapping an open row closes
  // it, and tapping a closed one toggles the detail.
  const onCardPress = () => {
    if (selecting) {
      Haptics.selectionAsync();
      onSelect?.(vm.id);
      return;
    }
    if (open) {
      close();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(vm.id);
  };

  // Safety guard before a destructive, irreversible delete.
  const confirmDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete match?',
      `This permanently deletes the match vs ${vm.opponent} and its games. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: close },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(vm.id) },
      ],
    );
  };

  return (
    // In selection mode the check sits OUTSIDE the card, to its left (as in a
    // WhatsApp chat); the gutter slides open and pushes the card right.
    <View className="flex-row items-center">
      <SelectionGutter
        selecting={selecting}
        selected={selected}
        onToggle={() => onSelect?.(vm.id)}
      />
      <Animated.View
        // Subtle fade + slight rise on mount, matching the design's `rowIn`.
        entering={FadeInDown.duration(380)
          .delay(Math.min(index, 8) * 35)
          .withInitialValues({ transform: [{ translateY: 6 }] })}
        className={`flex-1 overflow-hidden rounded-xl border bg-surface ${
          selected ? 'border-accent' : 'border-border'
        }`}
      >
        {/* Delete action sits BEHIND the card; the card slides left to reveal it. */}
        <View className="absolute inset-0 flex-row justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete match vs ${vm.opponent}`}
            onPress={confirmDelete}
            className="w-20 items-center justify-center bg-loss active:bg-loss-text"
          >
            <Feather name="trash-2" size={20} color={INK_PRIMARY} />
            <Text className="mt-1 font-display text-[11px] font-semibold text-ink-primary">
              Delete
            </Text>
          </Pressable>
        </View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={cardStyle}
            className={`flex-row ${selected ? 'bg-elevated' : 'bg-surface'}`}
          >
            {/* Result bar spans the full card height, including the expanded area. */}
            <View className={`w-1 self-stretch ${r.bar}`} />

            <View className="flex-1">
              <Pressable
                onPress={onCardPress}
                // Always set, even while selecting: if this prop disappears
                // mid-press (the long-press itself enters selection mode), the
                // release is treated as a tap and instantly deselects the row.
                onLongPress={() => {
                  if (selecting) {
                    Haptics.selectionAsync();
                    onSelect?.(vm.id);
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onLongPress?.(vm.id);
                }}
                delayLongPress={350}
                accessibilityState={selecting ? { selected } : undefined}
                className="min-h-[64px] flex-row items-center active:bg-elevated"
              >

                <View
                  className={`m-3 h-8 w-8 items-center justify-center rounded-lg ${r.badge}`}
                >
                  <Text className={`font-display-bold text-sm ${r.text}`}>
                    {vm.letter}
                  </Text>
                </View>

                <View className="flex-1 py-3">
                  {/* "vs" prefix so the single name reads as the opponent, never
                      as your own. */}
                  <Text
                    className="font-display text-[15px] font-semibold text-ink-primary"
                    numberOfLines={1}
                  >
                    <Text className="font-normal text-ink-secondary">vs </Text>
                    {vm.opponent}
                  </Text>
                  <MatchMeta vm={vm} />
                </View>

                <View className="items-end py-3">
                  <Text className={`font-mono text-[15px] ${r.text}`}>{vm.score}</Text>
                  <Text className="mt-0.5 text-[11px] text-ink-secondary">
                    {vm.date}
                  </Text>
                </View>

                {/* No expanding while selecting, so no chevron either. */}
                {selecting ? (
                  <View className="w-3" />
                ) : (
                  <Animated.View
                    style={chevronStyle}
                    className="h-[26px] w-9 items-center justify-center"
                  >
                    <Feather name="chevron-down" size={16} color={INK_SECONDARY} />
                  </Animated.View>
                )}
              </Pressable>

              {/* Always mounted; height + opacity animate from a single `progress`. */}
              <Animated.View style={detailStyle} className="overflow-hidden">
                <View
                  onLayout={(e) => setDetailH(e.nativeEvent.layout.height)}
                  className="pb-3 pl-[52px] pr-3"
                >
                  {/* Names in the same order as every score line (you–them), so
                      the chips below read without guessing. */}
                  <Text
                    className="mb-2 font-display text-[11px] text-ink-secondary"
                    numberOfLines={1}
                  >
                    {vm.you} {EN_DASH} {vm.opponent}
                  </Text>

                  {/* Timed matches: the clock they were played to and what it
                      actually took. "overtime" is spelled out, not just colored. */}
                  {vm.timer && (
                    <Text
                      className={`mb-2 font-display text-[11px] ${
                        vm.timer.overtime ? 'text-loss-text' : 'text-ink-secondary'
                      }`}
                    >
                      {vm.timer.limit} round · played {vm.timer.played}
                      {vm.timer.overtime ? ' (overtime)' : ''}
                    </Text>
                  )}

                  <View className="flex-row flex-wrap gap-2">
                    {vm.games.map((g) => (
                      <GameChip key={g.n} {...g} />
                    ))}
                  </View>

                  {/* The deck you played. Tappable through to the list as it
                      was played, unless the deck has since been deleted — then
                      it's named, not linked. */}
                  {vm.deck && (
                    <View className="mt-3 flex-row items-center gap-1.5">
                      <Text className="font-display text-[11px] text-ink-secondary">
                        Deck
                      </Text>
                      {vm.deck.deleted ? (
                        <Text
                          className="flex-shrink text-[13px] text-ink-tertiary"
                          numberOfLines={1}
                        >
                          {vm.deck.name} (deleted)
                        </Text>
                      ) : (
                        <Pressable
                          accessibilityRole="link"
                          accessibilityLabel={`Open deck ${vm.deck.name}`}
                          disabled={selecting}
                          hitSlop={8}
                          onPress={() => vm.deck && router.push(deckHref(vm.deck))}
                          className="min-h-[32px] flex-shrink flex-row items-center gap-1"
                        >
                          <Text
                            className="flex-shrink font-display text-[13px] text-accent"
                            numberOfLines={1}
                          >
                            {vm.deck.name}
                          </Text>
                          <Feather name="chevron-right" size={14} color={ACCENT} />
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* Placeholder until the match detail screen is built. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View details of the match vs ${vm.opponent}`}
                    disabled={selecting}
                    onPress={() => router.push(`/matches/${vm.id}`)}
                    className="mt-3 h-10 flex-row items-center justify-center gap-1.5 self-start rounded-full border border-border px-4 active:bg-elevated"
                  >
                    <Text className="font-display text-[13px] text-ink-primary">
                      View details
                    </Text>
                    <Feather name="arrow-right" size={14} color={INK_PRIMARY} />
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
};

export default HistoryRow;
