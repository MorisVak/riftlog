import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { splitCardName, type CardRef } from '@riftlog/core';
import { LegendPortrait } from '@/components/deck/cardArt';
import Icon from '@/components/icon';

// `background` (tailwind.config.js), mirrored for gradient stops (they can't
// take a class): clear → nearly opaque, for the bottom shade.
const SHADE = ['#0D1B2A00', '#0D1B2A99', '#0D1B2AF7'] as const;
/** The slant of the cut between the two sides. */
const CUT = 11;

export type BannerSide = { name: string; legend: CardRef | null };

/** A side's art: the legend (face crop) or a quiet silhouette; darkened if it lost. */
const BannerArt = ({ legend, lost }: { legend: CardRef | null; lost: boolean }) => (
  <>
    {legend ? (
      <LegendPortrait card={legend} />
    ) : (
      <View className="absolute inset-0 items-center justify-center bg-elevated">
        <Icon name="user" size={40} className="text-border" />
      </View>
    )}
    {lost && <View className="absolute inset-0 bg-background/60" />}
  </>
);

/** A side's names in its bottom corner: the champion, then the player. */
const BannerName = ({ side, align }: { side: BannerSide; align: 'left' | 'right' }) => (
  <View className={`flex-1 ${align === 'right' ? 'items-end' : ''}`}>
    <Text className="font-display-bold text-[18px] text-ink-primary" numberOfLines={1}>
      {side.legend ? splitCardName(side.legend.name).head : 'No legend'}
    </Text>
    <Text className="text-[13px] text-ink-secondary" numberOfLines={1}>
      {side.name}
    </Text>
  </View>
);

/**
 * The versus banner: your legend on the left (you're p1), theirs on the
 * right, meeting at a slanted cut; the side that lost is darkened, so the
 * result reads in the picture too (a draw, or no result, darkens neither).
 * Along the bottom: both sides' names and, in the middle, a title in its
 * color over a score. The match detail's header and the between-games
 * screen share it, with the game-start intro in the same style.
 *
 * The cut needs no mask: the right side's box is skewed (clipping its art to
 * a parallelogram) and the art inside is skewed back, so it stays upright.
 */
const VersusBanner = ({
  you,
  them,
  outcome,
  title,
  titleClass,
  score,
  height = 216,
  className = '',
  accessibilityLabel,
}: {
  you: BannerSide;
  them: BannerSide;
  /** Your result — dims the side that lost. null: no one dimmed. */
  outcome: 'win' | 'loss' | 'draw' | null;
  title: string;
  /** The title's color class, e.g. a result `-text` token. */
  titleClass: string;
  score: string;
  height?: number;
  /** Outer layout, e.g. `-mx-4` to run edge to edge, or a rounded frame. */
  className?: string;
  accessibilityLabel: string;
}) => (
  <View
    accessible
    accessibilityLabel={accessibilityLabel}
    style={{ height }}
    className={`overflow-hidden bg-background ${className}`}
  >
    {/* Yours: the left side, running under theirs at the cut. */}
    <View className="absolute bottom-0 left-0 top-0 w-[60%]">
      <BannerArt legend={you.legend} lost={outcome === 'loss'} />
    </View>

    {/* Theirs: a skewed box (the slanted cut), art skewed back upright. */}
    <View
      style={{ transform: [{ skewX: `-${CUT}deg` }] }}
      className="absolute bottom-0 left-[50%] right-[-20%] top-0 overflow-hidden border-l-2 border-background"
    >
      <View
        style={{ transform: [{ skewX: `${CUT}deg` }] }}
        className="absolute bottom-0 left-[-12%] right-[8%] top-0"
      >
        <BannerArt legend={them.legend} lost={outcome === 'win'} />
      </View>
    </View>

    <LinearGradient
      colors={SHADE}
      locations={[0.35, 0.68, 1]}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />

    {/* Along the bottom: you · title and score · them. */}
    <View className="absolute bottom-0 left-0 right-0 flex-row items-end gap-3 px-4 pb-3.5">
      <BannerName side={you} align="left" />
      <View className="items-center">
        <Text className={`font-display-bold text-[15px] ${titleClass}`}>{title}</Text>
        <Text className="font-mono text-[36px] leading-[40px] text-ink-primary">{score}</Text>
      </View>
      <BannerName side={them} align="right" />
    </View>
  </View>
);

export default VersusBanner;
