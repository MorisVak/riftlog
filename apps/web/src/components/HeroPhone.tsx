"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { PhoneFrame } from "./PhoneFrame";
import { ModeSwitch, type ScoringMode } from "./ModeSwitch";
import type { ScreenshotName } from "./screenshots.generated";

type Size = { w: number; h: number };

type Shot = { shot: ScreenshotName; alt: string };

/** The board in each scoring mode — the same moment, only the controls differ. */
const PORTRAIT: Record<ScoringMode, Shot> = {
  detailed: {
    shot: "board",
    alt: "Riftlog score board mid-game: 5 to 3, Riven behind your half and Akali behind theirs, a running match clock, and Conquer, Hold and Special buttons for each player",
  },
  simple: {
    shot: "board-simple",
    alt: "Riftlog's simple score board mid-game: 5 to 3, Riven behind your half and Akali behind theirs, a running match clock, and a minus and a plus beside each score",
  },
};
const LANDSCAPE: Record<ScoringMode, Shot> = {
  detailed: {
    shot: "board-landscape",
    alt: "Riftlog score board held sideways: 5 to 3, each player's legend beside their score, a clock facing each player, and Conquer, Hold and Special buttons under each score",
  },
  simple: {
    shot: "board-simple-landscape",
    alt: "Riftlog's simple score board held sideways: 5 to 3, each player's legend beside their score, a clock facing each player, and a minus and a plus beside each score",
  },
};

/**
 * Both modes' shots in one grid cell, crossfading: the hidden one keeps its
 * size and stays loaded, so switching never jumps or waits.
 */
function ModeShots({
  shots,
  mode,
  hidden,
  priority = false,
}: {
  shots: Record<ScoringMode, Shot>;
  mode: ScoringMode;
  /** The whole frame is the one not showing (mid-turn or turned away). */
  hidden: boolean;
  priority?: boolean;
}) {
  return (
    <div className="grid">
      {(Object.keys(shots) as ScoringMode[]).map((m) => (
        <div
          key={m}
          aria-hidden={hidden || m !== mode}
          className={`col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none ${
            m === mode ? "opacity-100" : "opacity-0"
          }`}
        >
          <PhoneFrame
            shot={shots[m].shot}
            alt={shots[m].alt}
            glow
            priority={priority && m === "detailed"}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The hero's score board, with a button that turns the phone sideways to show
 * the landscape board (and back), and a Detailed / Simple switch under it for
 * the app's two scoring modes (each frame crossfades between them). Hero
 * only — the feature sections stay portrait. The arrow points the way the phone will turn: counter-clockwise
 * into landscape (the shot was taken that way, island on the left),
 * clockwise back.
 *
 * Both frames are mounted, stacked on the same center. Turning rotates the
 * shown frame a quarter turn while the other rotates in from the opposite
 * quarter, each scaled so its outline matches the other's at the end of the
 * turn — one continuous motion, with the screens crossfading under it. The
 * scale comes from the frames' measured sizes, re-measured on resize.
 *
 * The scoring-mode switch sits above the phone, so it's in view on first
 * load. On wide screens the box stays as tall as the portrait frame, so the
 * text beside it never moves; on phones its height eases between the two frames — one
 * motion after the other, never together: turning sideways the phone turns
 * first and the box shrinks after; turning back the box grows first. Mid-turn
 * the phone is wider than either frame, so a box resizing alongside it let
 * it spill out of the hero, over the face-off heading.
 */

/** The quarter turn (`.phone-turn` in globals.css) and the box's resize, in ms. */
const TURN_MS = 700;
const RESIZE_MS = 450;
/**
 * The switch and the turn button pop in this long before the phone's
 * entrance ends — its tail is a long, slow ease, and the phone already looks
 * in place by then. The button follows the switch by POP_STAGGER_MS.
 */
const POP_LEAD_MS = 560;
const POP_STAGGER_MS = 110;
/** Below Tailwind's `lg`, where the box changes height (above it, it's fixed). */
const NARROW = "(max-width: 1023.98px)";
export function HeroPhone() {
  const [landscape, setLandscape] = useState(false);
  const [mode, setMode] = useState<ScoringMode>("detailed");
  // The turn button hides while the phone turns and pops back in at its new
  // corner once the phone is in place (sliding along with the turn looked
  // like it was dragging the phone).
  const [turning, setTurning] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // On load, one thing after the other: the phone rises into place (the
  // hero's `.animate-rise` around it), then the turn button pops in — timed
  // off the real animation, starting just before its slow tail ends, when the
  // phone already looks settled. With reduced motion there is none, so it
  // shows at once.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const rise = wrapRef.current?.closest(".animate-rise");
    const animation = rise?.getAnimations()[0];
    const timing = animation?.effect?.getComputedTiming();
    const left =
      typeof timing?.endTime === "number" && typeof animation?.currentTime === "number"
        ? timing.endTime - animation.currentTime
        : 0;
    const timer = window.setTimeout(() => setEntered(true), Math.max(0, left - POP_LEAD_MS));
    return () => window.clearTimeout(timer);
  }, []);
  const [sizes, setSizes] = useState<{ p: Size; l: Size } | null>(null);
  const [narrow, setNarrow] = useState(false);
  const portraitRef = useRef<HTMLDivElement>(null);
  const landscapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = portraitRef.current;
    const l = landscapeRef.current;
    if (!p || !l) return;
    // offsetWidth/Height ignore transforms, so a frame mid-turn measures true.
    const measure = () =>
      setSizes({
        p: { w: p.offsetWidth, h: p.offsetHeight },
        l: { w: l.offsetWidth, h: l.offsetHeight },
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(p);
    observer.observe(l);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // On phones: shrink only once the turn is done; turn back only once the
  // box has grown. (Reduced motion: no transitions, so no delays either.)
  const resizeDelay = narrow && landscape ? TURN_MS : 0;
  const turnDelay = narrow && !landscape ? RESIZE_MS : 0;
  // `.phone-turn` transitions transform, then opacity (175ms into the turn).
  const turnTiming = { transitionDelay: `${turnDelay}ms, ${turnDelay + 175}ms` };

  // Portrait turned a quarter lies as wide as the landscape frame, and
  // landscape turned back stands as tall as the portrait one.
  const toLandscape = sizes ? sizes.l.w / sizes.p.h : 1;
  const toPortrait = sizes ? sizes.p.h / sizes.l.w : 1;

  // The first pop (on load) follows the switch's; after a turn, none.
  const [turnedOnce, setTurnedOnce] = useState(false);

  const turn = () => {
    if (turning || !entered) return;
    setTurnedOnce(true);
    setLandscape((on) => !on);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // In place after the turn — and, on phones, after the resize too.
    setTurning(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(
      () => setTurning(false),
      TURN_MS + (narrow ? RESIZE_MS : 0) + 50,
    );
  };

  const Icon = landscape ? RotateCw : RotateCcw;
  const label = landscape ? "Show the board upright" : "Show the board sideways";

  return (
    <div ref={wrapRef} className="flex w-full max-w-[560px] flex-col items-center gap-6">
      <ModeSwitch mode={mode} onChange={setMode} shown={entered} />

      <div
        style={
          sizes
            ? {
                height: narrow && landscape ? sizes.l.h : sizes.p.h,
                transitionDelay: `${resizeDelay}ms`,
              }
            : undefined
        }
        className="relative w-full transition-[height] duration-[450ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
      >
        {/* Portrait sits in the flow until measured, so the box has its height
            from the first paint (and without JS). */}
        <div
          className={`flex items-center justify-center ${
            sizes ? "absolute inset-0" : "relative"
          }`}
        >
          <div
            ref={portraitRef}
            aria-hidden={landscape}
            style={{
              transform: landscape
                ? `rotate(-90deg) scale(${toLandscape})`
                : "none",
              ...turnTiming,
            }}
            className={`phone-turn w-full max-w-[280px] ${
              landscape ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <ModeShots shots={PORTRAIT} mode={mode} hidden={landscape} priority />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={landscapeRef}
            aria-hidden={!landscape}
            style={{
              transform: landscape
                ? "none"
                : `rotate(90deg) scale(${toPortrait})`,
              ...turnTiming,
            }}
            className={`phone-turn w-full ${
              landscape ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ModeShots shots={LANDSCAPE} mode={mode} hidden={!landscape} />
          </div>
        </div>

        {/* Pinned to the top-right corner of whichever frame is showing.
            It pops in once the phone is in place: after the hero's entrance
            on load, and at the new corner after each turn. */}
        <button
          type="button"
          onClick={turn}
          // Not `disabled`: that would drop keyboard focus mid-turn.
          aria-disabled={turning || !entered}
          aria-label={label}
          aria-pressed={landscape}
          title={label}
          style={
            sizes
              ? {
                  top: `calc(50% - ${(landscape ? sizes.l.h : sizes.p.h) / 2}px - 12px)`,
                  right: `calc(50% - ${(landscape ? sizes.l.w : sizes.p.w) / 2}px - 12px)`,
                  animationDelay: turnedOnce ? "0ms" : `${POP_STAGGER_MS}ms`,
                }
              : undefined
          }
          // Hiding is instant (it moves while hidden); showing replays the
          // `.animate-pop` keyframes each time the class comes back.
          className={`absolute -right-3 -top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated text-accent-soft shadow-accent-btn hover:bg-surface hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
            turning || !entered
              ? "pointer-events-none opacity-0"
              : "animate-pop transition-colors"
          }`}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
