"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { PhoneFrame } from "./PhoneFrame";

type Size = { w: number; h: number };

/**
 * The hero's score board, with a button that turns the phone sideways to show
 * the landscape board (and back). Hero only — the feature sections stay
 * portrait. The arrow points the way the phone will turn: clockwise into
 * landscape, counter-clockwise back.
 *
 * Both frames are mounted, stacked on the same center. Turning rotates the
 * shown frame a quarter turn while the other rotates in from the opposite
 * quarter, each scaled so its outline matches the other's at the end of the
 * turn — one continuous motion, with the screens crossfading under it. The
 * scale comes from the frames' measured sizes, re-measured on resize.
 *
 * On wide screens the box is as tall as the portrait frame, so the text beside
 * it never moves; on phones its height eases between the two frames.
 */
export function HeroPhone() {
  const [landscape, setLandscape] = useState(false);
  const [sizes, setSizes] = useState<{ p: Size; l: Size } | null>(null);
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

  // Portrait turned clockwise lies as wide as the landscape frame, and
  // landscape turned back stands as tall as the portrait one.
  const toLandscape = sizes ? sizes.l.w / sizes.p.h : 1;
  const toPortrait = sizes ? sizes.p.h / sizes.l.w : 1;

  const Icon = landscape ? RotateCcw : RotateCw;
  const label = landscape ? "Show the board upright" : "Show the board sideways";

  return (
    <div
      style={
        sizes ? { height: landscape ? sizes.l.h : sizes.p.h } : undefined
      }
      className="relative w-full max-w-[560px] transition-[height] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none lg:h-[620px]!"
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
              ? `rotate(90deg) scale(${toLandscape})`
              : "none",
          }}
          className={`phone-turn w-full max-w-[300px] ${
            landscape ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <PhoneFrame
            shot="board"
            alt="Riftlog score board mid-game: 5 to 4, with a running match clock and Conquer, Hold and Special buttons for each player"
            glow
            priority
          />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={landscapeRef}
          aria-hidden={!landscape}
          style={{
            transform: landscape
              ? "none"
              : `rotate(-90deg) scale(${toPortrait})`,
          }}
          className={`phone-turn w-full ${
            landscape ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <PhoneFrame
            shot="board-landscape"
            alt="Riftlog score board held sideways: 5 to 4, a clock facing each player, and each player's Conquer, Hold and Special buttons under their score"
            glow
          />
        </div>
      </div>

      {/* Pinned to the top-right corner of whichever frame is showing; it
          glides there alongside the turn. */}
      <button
        type="button"
        onClick={() => setLandscape((on) => !on)}
        aria-label={label}
        aria-pressed={landscape}
        title={label}
        style={
          sizes
            ? {
                top: `calc(50% - ${(landscape ? sizes.l.h : sizes.p.h) / 2}px - 12px)`,
                right: `calc(50% - ${(landscape ? sizes.l.w : sizes.p.w) / 2}px - 12px)`,
              }
            : undefined
        }
        className="absolute -right-3 -top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated text-accent-soft shadow-accent-btn transition-[top,right,color,background-color] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] hover:bg-surface hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
      >
        <Icon size={20} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
