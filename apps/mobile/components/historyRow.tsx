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
import MatchRowDetail from './match/matchRowDetail';
import { CardBackdrop } from './deck/cardArt';
import PressOverlay from './pressOverlay';
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


// Expand/collapse share one timing window so the result bar, the detail height,
// and the chevron all move together — no half-collapsed "cut off" bar.
const EXPAND_MS = 240;
const EXPAND_EASING = Easing.inOut(Easing.cubic);

// Swipe-left distance that fully reveals the delete action sitting behind the
// card (matches the w-20 trash button).
const ACTION_W = 80;
const SWIPE_MS = 180;


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
  // Whether the detail has ever been opened: it's built then, and kept.
  const [opened, setOpened] = useState(expanded);
  useEffect(() => {
    if (expanded) setOpened(true);
  }, [expanded]);

  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: EXPAND_MS,
      easing: EXPAND_EASING,
    });
  }, [expanded, progress]);

  // Animating `height` (a layout prop) re-lays out the row each frame, so the
  // self-stretch result bar tracks the growing/shrinking card in lockstep.
  // `detailH` as a dependency: the detail is built on first open, so its
  // height arrives after the animation has started.
  const detailStyle = useAnimatedStyle(
    () => ({
      height: detailH * progress.value,
      opacity: progress.value,
    }),
    [detailH],
  );
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

  // Built once, outside the press callback: a press then redraws only
  // the overlay, not the art and text (that made taps lag).
  const content = (
    <>
      {vm.yourLegend && (
        <CardBackdrop
          card={vm.yourLegend}
          fill={selected ? 'elevated' : 'surface'}
        />
      )}

      <View
        className={`m-3 h-8 w-8 items-center justify-center rounded-lg ${r.badge}`}
      >
        <Text className={`font-display-bold text-sm ${r.text}`}>
          {vm.letter}
        </Text>
      </View>

      <View className="flex-1 py-3">
        {/* A soft dark pill hugging the text over the legend art. */}
        <View
          className={
            vm.yourLegend
              ? '-ml-2 max-w-full self-start rounded-lg bg-background/55 px-2 py-1'
              : ''
          }
        >
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
      </View>

      {/* On a dark pill over the legend art, so it reads on any art. */}
      <View
        className={`items-end ${
          vm.yourLegend
          ? 'my-3 rounded-md bg-background/70 px-1.5 py-0.5'
          : 'py-3'
        }`}
      >
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
    </>
  );

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
          // Selected (selection mode): full accent. Open: a softer accent
          // frame, so the expanded row stands apart from the rest.
          selected ? 'border-accent' : expanded ? 'border-accent/50' : 'border-border'
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
                // The opponent's legend is the backdrop here, which would hide a
                // background change, so a press shows as an overlay instead.
                className="relative min-h-[64px] flex-row items-center overflow-hidden"
              >
                {({ pressed }) => (
                  <>
                    {content}
                    <PressOverlay pressed={pressed} />
                  </>
                )}
              </Pressable>

              {/* Height + opacity animate from a single `progress`. The content
                  is only built once the row has been opened: closed rows stay
                  light (it holds legend art). */}
              <Animated.View style={detailStyle} className="overflow-hidden">
                {/* Absolute, so it keeps its natural height to measure while
                    the container is still 0 tall (content built on open). */}
                <View
                  style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
                  onLayout={(e) => setDetailH(e.nativeEvent.layout.height)}
                >
                  {opened && (
                    <MatchRowDetail
                      vm={vm}
                      disabled={selecting}
                      onOpenDeck={() => vm.deck && router.push(deckHref(vm.deck))}
                      onOpenDetails={() => router.push(`/matches/${vm.id}`)}
                    />
                  )}
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
};

// Memoized: expanding one row re-renders the list (`extraData`), and every
// row carries legend art — only the rows whose props changed should redraw.
export default React.memo(HistoryRow);
