import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { Deck } from '@/lib/decks';
import { CardBackdrop } from '@/components/deck/cardArt';
import { CTA_GLOW } from '@/components/ctaGlow';
import Icon from '@/components/icon';

// `surface` mirrored for the gradient: a shade along the bottom, under the
// button, so it sits on calm ground whatever the art.
const BOTTOM_SHADE = ['#18223A00', '#18223ACC'] as const;

/** The hero's least height; on taller screens it grows to fill Home. */
const HERO_MIN_H = 176;
const HERO_MAX_H = 320;

/** What the top-left of the card says, and the action beside it. */
export type HeroDeckState =
  | { kind: 'deck'; deck: Deck }
  | { kind: 'none' } // decks, but no default chosen
  | { kind: 'empty' } // no decks yet
  | { kind: 'guest' }
  | { kind: 'loading' };

/**
 * Home's hero: "Start a match" on your default deck's legend art — the deck
 * the match starts with, named in the corner with "Change" beside it, right
 * where it's used. Without a deck it's the same card without art: "Choose"
 * one, "Import" your first, or (a guest) just play.
 */
const HeroCard = ({
  state,
  onStart,
  onChange,
  onImport,
}: {
  state: HeroDeckState;
  onStart: () => void;
  /** Opens the deck sheet to pick the default deck. */
  onChange: () => void;
  onImport: () => void;
}) => {
  const legend = state.kind === 'deck' ? state.deck.list.legend : null;

  const action =
    state.kind === 'deck'
      ? { label: 'Change', onPress: onChange }
      : state.kind === 'none'
        ? { label: 'Choose', onPress: onChange }
        : state.kind === 'empty'
          ? { label: 'Import', onPress: onImport }
          : null;

  return (
    <View
      style={{ minHeight: HERO_MIN_H, maxHeight: HERO_MAX_H }}
      className="relative flex-1 overflow-hidden rounded-[22px] border border-border bg-surface"
    >
      {legend && <CardBackdrop card={legend} />}
      <LinearGradient
        colors={BOTTOM_SHADE}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 }}
      />

      <View className="flex-1 justify-between p-4">
        {/* The default deck, and changing it. */}
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className="font-display text-[12px] text-ink-secondary">
              {state.kind === 'guest' ? 'Guest mode' : 'Default deck'}
            </Text>
            <Text
              className="mt-0.5 font-display-bold text-[21px] text-ink-primary"
              numberOfLines={1}
            >
              {state.kind === 'deck'
                ? state.deck.name
                : state.kind === 'none'
                  ? 'None chosen'
                  : state.kind === 'empty'
                    ? 'No decks yet'
                    : state.kind === 'guest'
                      ? 'Ready to play'
                      : ' '}
            </Text>
            <Text className="mt-0.5 text-[13px] text-ink-secondary" numberOfLines={1}>
              {state.kind === 'deck'
                ? (legend?.name ?? ' ')
                : state.kind === 'none'
                  ? 'Pick the deck your matches start with.'
                  : state.kind === 'empty'
                    ? 'Import one to play with it.'
                    : state.kind === 'guest'
                      ? 'Track the score live.'
                      : ' '}
            </Text>
          </View>
          {action && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                action.label === 'Import' ? 'Import a deck' : `${action.label} default deck`
              }
              onPress={() => {
                Haptics.selectionAsync();
                action.onPress();
              }}
              hitSlop={6}
              className="h-9 flex-row items-center gap-1.5 rounded-full border border-border bg-background/75 px-3.5 active:bg-background"
            >
              <Icon
                name={action.label === 'Import' ? 'plus' : 'repeat'}
                size={13}
                className="text-accent"
              />
              <Text className="font-display text-[14px] text-accent">{action.label}</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a match"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onStart();
          }}
          style={CTA_GLOW}
          className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-full bg-accent active:bg-accent-strong"
        >
          <Icon name="play" size={17} className="text-background" />
          <Text className="font-display-bold text-[17px] text-background">Start a match</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default HeroCard;
