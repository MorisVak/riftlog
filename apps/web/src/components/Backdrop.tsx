/**
 * The page's background structure: a faint dot grid with a soft accent glow,
 * fading out toward the edges (first drawn for the roadmap; the owner wanted
 * it across the page, 2026-11-10). `at` puts the focus where the section's
 * picture is — centre, the side its phones are on, or `frame` (wide, for a
 * card that would hide a centred grid) — so the grid sits behind the content
 * without crowding the text. Put it first inside a
 * `relative overflow-hidden` section, and give the content `relative`.
 */
type At = "center" | "left" | "right" | "frame";

// Full class strings (Tailwind only sees literal classes).
const MASK: Record<At, string> = {
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

export function Backdrop({
  at = "center",
  glow = true,
}: {
  at?: At;
  /** Off where the section already has its own glow (the hero). */
  glow?: boolean;
}) {
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[28px_28px] opacity-70 ${MASK[at]}`}
      />
      {glow && (
        <div
          aria-hidden
          className={`pointer-events-none absolute top-1/2 h-[480px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px] ${GLOW[at]}`}
        />
      )}
    </>
  );
}
