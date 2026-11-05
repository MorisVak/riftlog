import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { splitCardName, type CardRef, type CatalogPrinting } from '@riftlog/core';
import Icon from '@/components/icon';
import Foil, { isFoiled } from '@/components/deck/foil';
import { useCardMatch } from '@/hooks/useCardMatch';
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
const CardArt = ({ card, variant, width, chosen = false }: CardArtProps) => {
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
        // Gallery tiles and the card sheet only: rows and headers are too small to read it.
        foil={(variant === 'tile' || variant === 'sheet') && isFoiled(printing.rarity)}
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
 * A card's art as the backdrop of a deck card (Home's "Recently played deck",
 * "My decks"): the art, cropped by `LEGEND_FOCUS`, fills the right of the parent, which must
 * be `relative` + `overflow-hidden`, and fades into `bg-surface` toward the
 * left so the text there stays readable. Nothing with the flag off or no art.
 * Decorative: hidden from screen readers.
 */
export const CardBackdrop = ({
  card,
  fill = 'surface',
}: {
  card: CardRef;
  /** The card's background, so the fade meets it seamlessly. */
  fill?: keyof typeof FADES;
}) => {
  const fade = FADES[fill];
  const { width: screen } = useWindowDimensions();
  const { match } = useCardMatch(card);
  const printing = CARD_ART && match && match.kind !== 'unknown' ? match.printing : null;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const focus = printing ? backdropFocus(printing.code) : DEFAULT_FOCUS;
  // The art is drawn wider than the box (only the crop shows): size the URL for that.
  const urls = printing ? cardImageUrls(printing, (box?.w ?? screen * 0.7) / focus.w) : [];
  const [attempt, setAttempt] = useState(0);
  const uri = urls[attempt] ?? null;
  if (!uri) return null;

  // Place the art so its focus point sits FOCUS_AT across the box (the left
  // is faded) and halfway down, scaled so
  // the crop spans the box's width; clamped so the art always covers the box.
  let art: { width: number; height: number; left: number; top: number } | null = null;
  if (box) {
    const width = box.w / focus.w;
    const height = width * PORTRAIT;
    art = {
      width,
      height,
      left: Math.min(0, Math.max(box.w - width, box.w * FOCUS_AT - focus.x * width)),
      top: Math.min(0, Math.max(box.h - height, box.h / 2 - focus.y * height)),
    };
  }

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      className="absolute bottom-0 right-0 top-0 w-[70%] overflow-hidden"
    >
      {art && (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', ...art, opacity: 0.85 }}
          contentFit="cover"
          transition={160}
          recyclingKey={`${printing?.code}-backdrop-${attempt}`}
          onError={() => setAttempt((a) => a + 1)}
        />
      )}
      <LinearGradient
        colors={[fade.solid, fade.clear]}
        locations={[0.05, 0.75]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {/* A light shade on the right edge for the date and chevron. */}
      <LinearGradient
        colors={[fade.clear, fade.shade]}
        start={{ x: 0.6, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
};

export default CardArt;
