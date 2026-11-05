import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  legendArtPrinting,
  NO_LEGEND_ART,
  splitCardName,
  type CardRef,
  type CatalogPrinting,
} from '@riftlog/core';
import Icon from '@/components/icon';
import Foil, { isFoiled } from '@/components/deck/foil';
import { useCardMatch } from '@/hooks/useCardMatch';
import { useCatalog } from '@/contexts/catalogContext';
import { useProfile } from '@/contexts/profileContext';
import { cardImageUrls } from '@/lib/cardImage';
import legendArtFocus from '@/lib/legendArtFocus.json';
import { CARD_ART } from '@/lib/featureFlags';

type CardArtProps = {
  card: CardRef;
  /**
   * `thumb` sits inside a card row; `feature` is the identity card in a deck
   * header (legend, chosen champion); `tile` fills a gallery cell and `sheet`
   * the card details sheet (both take their width from `width`).
   */
  variant: 'thumb' | 'feature' | 'tile' | 'sheet';
  /** `tile` / `sheet`: the width, in points. */
  width?: number;
  /** The chosen champion in a decklist: framed in gold. */
  chosen?: boolean;
  /**
   * The foil sheen on rare-and-better art — only where you look at the card
   * itself: on by default in the card sheet, and on tiles only when asked
   * for (the decklist gallery), not in pickers like the legend grid.
   */
  foil?: boolean;
};

const THUMB_W = 30;
const FEATURE_W = 72;
/** Card proportions, 63 × 88 mm; battlefields are the same card turned sideways. */
const PORTRAIT = 88 / 63;

/**
 * The ONE place card art is decided. Every deck surface renders cards through
 * `CardRow` / `CardGrid` / the deck header / the card sheet → here.
 *
 * Art shows only with the CARD_ART flag on (dev and preview builds, see
 * lib/featureFlags.ts) and when the card matches the catalog: by code, else by
 * name to the card's base printing. Otherwise it's the placeholder it always
 * was — `thumb` renders nothing, so rows stay text-only.
 */
const CardArt = ({ card, variant, width, chosen = false, foil }: CardArtProps) => {
  const frame = chosen ? 'border-2 border-chosen' : 'border border-border';
  const { match } = useCardMatch(card);
  const printing = CARD_ART && match && match.kind !== 'unknown' ? match.printing : null;
  const landscape = printing?.orientation === 'landscape';

  if (printing && (printing.image_url || printing.storage_path)) {
    const w =
      variant === 'thumb'
        ? landscape
          ? THUMB_W * PORTRAIT
          : THUMB_W
        : variant === 'feature'
          ? FEATURE_W
          : (width ?? FEATURE_W);
    // A landscape card keeps its width and gets shorter.
    const h = landscape ? w / PORTRAIT : w * PORTRAIT;
    return (
      <CardImage
        printing={printing}
        width={w}
        height={h}
        rounded={variant === 'thumb' ? 'rounded-[3px]' : 'rounded-lg'}
        chosen={chosen}
        foil={(foil ?? variant === 'sheet') && isFoiled(printing.rarity)}
      />
    );
  }

  if (variant === 'thumb') return null;

  if (variant === 'tile' || variant === 'sheet') {
    // Card-shaped placeholder that names the card, since there's no image to
    // tell tiles apart. "Champion, Title" breaks after the champion.
    const { head, title } = splitCardName(card.name);
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ width }}
        className={`aspect-[63/88] items-center justify-center gap-1.5 rounded-lg bg-elevated px-2 ${frame}`}
      >
        <Icon name="image" size={16} className="text-ink-tertiary" />
        <Text className="text-center font-display text-[12px] leading-4 text-ink-primary" numberOfLines={3}>
          {head?.trim()}
        </Text>
        {title !== '' && (
          <Text className="text-center text-[10px] leading-[13px] text-ink-secondary" numberOfLines={2}>
            {title}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`aspect-[63/88] w-[72px] items-center justify-center rounded-lg bg-elevated ${frame}`}
    >
      <Icon name="image" size={18} className="text-ink-tertiary" />
    </View>
  );
};

/**
 * One card image: our self-hosted copy first, then Riot's CDN, and an empty
 * card-shaped frame if every URL fails.
 */
const CardImage = ({
  printing,
  width,
  height,
  rounded,
  chosen,
  foil,
}: {
  printing: CatalogPrinting;
  width: number;
  height: number;
  rounded: string;
  chosen: boolean;
  foil: boolean;
}) => {
  // Our bucket first (small or full), then Riot's CDN; each failure tries the next.
  const urls = cardImageUrls(printing, width);
  const [attempt, setAttempt] = useState(0);
  const uri = urls[attempt] ?? null;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      // `isolate` keeps the foil's blend inside the card.
      style={{ width, height, isolation: 'isolate' }}
      className={`overflow-hidden bg-elevated ${rounded} ${
        chosen ? 'border-2 border-chosen' : 'border border-border/60'
      }`}
    >
      {uri && (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          // Decoded art stays in memory: a card shown again (a list
          // scrolled back, a screen revisited) appears at once instead of
          // being read from disk and decoded again.
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={`${printing.code}-${attempt}`}
          onError={() => setAttempt((a) => a + 1)}
        />
      )}
      {uri && foil && <Foil width={width} height={height} />}
    </View>
  );
};

/**
 * The backdrop fades into its card's fill: `bg-surface`, or `bg-elevated` for
 * a selected / pressed row (tailwind.config.js). Opaque, clear, and a shade
 * for the right edge — gradient stops can't take a class.
 */

const FADES = {
  surface: { solid: '#18223A', clear: '#18223A00', shade: '#18223AD9' },
  elevated: { solid: '#222D47', clear: '#222D4700', shade: '#222D47D9' },
} as const;

type Focus = { x: number; y: number; w: number };

/**
 * Where each legend printing's art is cropped as a backdrop: the focus point
 * (fractions of the image's width / height) and crop width (fraction of the
 * image width). Generated by `pnpm catalog:legend-focus` (face detection), so
 * every deck frames its legend alike: face centered, face the same size.
 */
const LEGEND_FOCUS: Record<string, Focus> = legendArtFocus;
/** For printings the file doesn't know yet: the upper middle of the art. */
const DEFAULT_FOCUS: Focus = { x: 0.5, y: 0.3, w: 0.8 };
/** How far across the box the focus point sits: right of center, clear of the fade. */
const FOCUS_AT = 0.62;
const backdropFocus = (code: string): Focus => LEGEND_FOCUS[code] ?? DEFAULT_FOCUS;

/**
 * The art printing for a legend's decorative art (backdrops, portraits), or
 * null with the flag off / not in the catalog. Your legend-art preference
 * (Profile → Legend art) picks the printing here — display only, so the deck
 * view and the card sheet (`CardArt`) keep showing the deck's own printing.
 */
const useArtPrinting = (card: CardRef | null): CatalogPrinting | null => {
  const { match } = useCardMatch(card ?? { name: '', code: null });
  const { index } = useCatalog();
  const { profile } = useProfile();
  const pref = profile?.legendArt ?? NO_LEGEND_ART;
  if (!card || !CARD_ART || !match || match.kind === 'unknown' || !index) return null;
  const p = legendArtPrinting(match.card, match.printing, pref, index);
  return p && (p.image_url || p.storage_path) ? p : null;
};

/** The width : height of the crops in `LEGEND_FOCUS` (`boxAspect` in legend-focus.swift). */
const BACKDROP_ASPECT = 2.6;

/** The printed card frame's width at each edge, as a share of the image. */
const FRAME_X = 0.07;
const FRAME_Y = 0.035;
/** The backdrop's fade into the card's fill, as stops across the box (solid → clear). */
const FADE_STOPS = [0.05, 0.75] as const;

/** The left margin that also skips the domain-icon column (top-left). */
const ICON_COLUMN = 0.2;

/**
 * Where the art's edge goes (its `left` / `top`): `wanted`, but kept inside
 * the illustration so the card frame never shows at the box's edges — and,
 * when the box is too big for that, at least inside the image.
 */
function clampInside(
  wanted: number,
  boxSize: number,
  artSize: number,
  frame: number,
  frameEnd = frame,
): number {
  const max = -frame * artSize; // the frame's inner edge at the box's start
  const min = boxSize - (1 - frameEnd) * artSize; // …and at its end
  if (min <= max) return Math.min(max, Math.max(min, wanted));
  // The illustration is narrower than the box (a zoomed-out crop): keep the
  // focus where it was asked for, but never short of the box's end (no gap
  // there); the start is left to the caller's edge fade.
  return Math.max(min, wanted);
}

type Rect = { width: number; height: number; left: number; top: number };

/**
 * Where a printing's art goes to fill a `boxW` × `boxH` box, cropped on its
 * `LEGEND_FOCUS` point: the focus sits `focusAt` across the box and halfway
 * down; the art always covers the box, and the card frame stays out of it
 * where it can (`clampInside`).
 *
 * `scaleBy`: `width` — the crop spans the box's width (wide boxes);
 * `height` — the crop's height as on a full-width backdrop spans the box's
 * height, so a face keeps that size in narrow or very wide boxes (match rows).
 */
function artRect(
  code: string,
  boxW: number,
  boxH: number,
  focusAt: number,
  scaleBy: 'width' | 'height',
  /** The image's left margin to keep out — wider to skip the domain icons. */
  frameLeft = FRAME_X,
): Rect {
  const focus = backdropFocus(code);
  // The crop is BACKDROP_ASPECT wide for its height (legend-focus.swift).
  const scaled = scaleBy === 'width' ? boxW / focus.w : (boxH * BACKDROP_ASPECT) / focus.w;
  // The illustration always covers the whole box, frame kept out: a crop
  // wider than that (a legend whose face fills its card, e.g. Vex - Gloomist)
  // gets zoomed in until it does. Its face comes out a little larger, but
  // every backdrop then starts at the box's edge and fades the same way — a
  // narrower art started partway in and read as cut off.
  const width = Math.max(
    scaled,
    boxW / (1 - frameLeft - FRAME_X),
    boxH / ((1 - 2 * FRAME_Y) * PORTRAIT),
  );
  const height = width * PORTRAIT;
  return {
    width,
    height,
    left: clampInside(boxW * focusAt - focus.x * width, boxW, width, frameLeft, FRAME_X),
    top: clampInside(boxH / 2 - focus.y * height, boxH, height, FRAME_Y),
  };
}

/** A printing's image URL at `widthPt`, moving to the next source on error. */
function useArtUri(printing: CatalogPrinting | null, widthPt: number) {
  const [attempt, setAttempt] = useState(0);
  const urls = printing ? cardImageUrls(printing, widthPt) : [];
  return {
    uri: urls[attempt] ?? null,
    key: `${printing?.code}-backdrop-${attempt}`,
    onError: () => setAttempt((a) => a + 1),
  };
}

/** One printing's art filling its parent box, placed by `artRect`. */
const FocusedArt = ({
  printing,
  focusAt,
  scaleBy = 'width',
  skipFrame = false,
  edgeFade,
}: {
  printing: CatalogPrinting;
  focusAt: number;
  scaleBy?: 'width' | 'height';
  /** Keep the domain-icon column out too (portraits), not just the frame. */
  skipFrame?: boolean;
  /** The box's fill: the art fades into it toward the left, the same for every legend. */
  edgeFade?: { solid: string; clear: string };
}) => {
  const { width: screen } = useWindowDimensions();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const art = box
    ? artRect(printing.code, box.w, box.h, focusAt, scaleBy, skipFrame ? ICON_COLUMN : FRAME_X)
    : null;
  const { uri, key, onError } = useArtUri(printing, art?.width ?? screen);
  return (
    <View
      className="absolute inset-0 overflow-hidden"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        // Only a real change re-renders (a re-layout reports the same size).
        setBox((cur) => (cur && cur.w === w && cur.h === h ? cur : { w, h }));
      }}
    >
      {art && uri && (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', ...art, opacity: 0.85 }}
          contentFit="cover"
          // See CardArt: decoded art stays in memory between showings.
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={key}
          onError={onError}
        />
      )}
      {art && edgeFade && (
        <LinearGradient
          colors={[edgeFade.solid, edgeFade.clear]}
          locations={FADE_STOPS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}
    </View>
  );
};

/**
 * A legend's art filling its parent box (which must be `relative`), cropped
 * on its face like the backdrops — for match setup's portraits. Nothing with
 * the flag off or no art; decorative.
 */
export const LegendPortrait = ({ card }: { card: CardRef }) => {
  const printing = useArtPrinting(card);
  if (!printing) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-0"
    >
      <FocusedArt printing={printing} focusAt={0.5} skipFrame />
    </View>
  );
};

type Fill = keyof typeof FADES;
/**
 * The shade over backdrop art on the right edge, for the date and chevron.
 * (The fade on the left is `FocusedArt`'s `edgeFade`.)
 */
const BackdropOverlays = ({ fill }: { fill: Fill }) => {
  const fade = FADES[fill];
  return (
    <LinearGradient
      colors={[fade.clear, fade.shade]}
      start={{ x: 0.6, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
};

const BACKDROP_BOX = 'absolute bottom-0 right-0 top-0 overflow-hidden';

/**
 * A card's art as the backdrop of a deck card (Home's "Recently played deck",
 * "My decks", the deck picker field, a match row): the art, cropped by
 * `LEGEND_FOCUS`, fills the right ~70% of the parent, which must be
 * `relative` + `overflow-hidden`, and fades into the card's fill toward the
 * left so the text there stays readable. Nothing with the flag off or no art.
 * Decorative: hidden from screen readers.
 */
export const CardBackdrop = ({
  card,
  fill = 'surface',
}: {
  card: CardRef;
  /** The card's background, so the fade meets it seamlessly. */
  fill?: Fill;
}) => {
  const printing = useArtPrinting(card);
  if (!printing) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`${BACKDROP_BOX} w-[70%]`}
    >
      <FocusedArt printing={printing} focusAt={FOCUS_AT} edgeFade={FADES[fill]} />
      <BackdropOverlays fill={fill} />
    </View>
  );
};

export default CardArt;
