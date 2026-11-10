import type { CSSProperties } from "react";

/**
 * The page's background structure: a faint texture with a soft accent glow,
 * fading out toward the edges (first drawn for the roadmap; the owner wanted
 * structure across the page, 2026-11-10 — any texture, as long as it stays
 * quiet). Each section gets a texture that means something there (see
 * TEXTURE), always drawn in the `border` token and kept faint.
 *
 * `at` puts the focus where the section's picture is — centre, the side its
 * phones are on, or `frame` (wide, for a card that would hide a centred
 * texture) — so it sits behind the content without crowding the text. Put it
 * first inside a `relative overflow-hidden` section; give the content
 * `relative`.
 */
type At = "center" | "left" | "right" | "frame";
export type Texture = "dots" | "grid" | "slant" | "hex" | "ruled";

// Full class strings (Tailwind only sees literal classes).
const FADE: Record<At, string> = {
  center: "mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
  left: "mask-[radial-gradient(ellipse_at_28%_50%,black_20%,transparent_65%)]",
  right: "mask-[radial-gradient(ellipse_at_72%_50%,black_20%,transparent_65%)]",
  frame: "mask-[radial-gradient(ellipse_at_center,black_55%,transparent_95%)]",
};
const GLOW: Record<At, string> = {
  center: "left-1/2",
  left: "left-[28%]",
  right: "left-[72%]",
  frame: "left-1/2",
};

/**
 * dots — the roadmap's map grid. grid — graph paper, a score sheet (hero).
 * slant — fine lines at the versus cut's 11° (face-off). hex — a honeycomb,
 * the logo's hexagon and the series pips (the table). ruled — a log's lines
 * (history). Lines cover more area than dots, so they sit fainter.
 */
const TEXTURE: Record<Texture, { className: string; style?: CSSProperties }> = {
  dots: {
    className:
      "bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[28px_28px] opacity-70",
  },
  grid: {
    className:
      "bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-size-[36px_36px] opacity-25",
  },
  slant: {
    className:
      "bg-[repeating-linear-gradient(101deg,var(--color-border)_0_1px,transparent_1px_24px)] opacity-35",
  },
  hex: {
    // The tile is a mask over the token colour, so no colour lives in the SVG.
    className: "bg-border opacity-40",
    style: {
      maskImage: "url(/textures/hex.svg)",
      WebkitMaskImage: "url(/textures/hex.svg)",
      maskSize: "27.713px 48px",
      WebkitMaskSize: "27.713px 48px",
    },
  },
  ruled: {
    className:
      "bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0_1px,transparent_1px_32px)] opacity-35",
  },
};

export function Backdrop({
  at = "center",
  texture = "dots",
  glow = true,
}: {
  at?: At;
  texture?: Texture;
  /** Off where the section already has its own glow (the hero). */
  glow?: boolean;
}) {
  const { className, style } = TEXTURE[texture];
  return (
    <>
      {/* The fade and the texture on separate layers: the hex texture is
          itself a mask, and an element has only one. */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${FADE[at]}`}>
        <div className={`absolute inset-0 ${className}`} style={style} />
      </div>
      {glow && (
        <div
          aria-hidden
          className={`pointer-events-none absolute top-1/2 h-[480px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px] ${GLOW[at]}`}
        />
      )}
    </>
  );
}
