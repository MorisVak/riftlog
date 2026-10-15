import type { ReactNode } from "react";
import { PhoneFrame } from "./PhoneFrame";
import { Reveal } from "./Reveal";
import type { ScreenshotName } from "./screenshots.generated";

type Shot = { shot: ScreenshotName; alt: string };

/**
 * One feature block: a short text column beside a row of real screenshots.
 * On narrow screens the text comes first and the phones scroll sideways.
 */
function Showcase({
  id,
  eyebrow,
  title,
  children,
  meta,
  shots,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
  meta: string;
  shots: Shot[];
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[2fr_3fr] lg:py-28">
        <Reveal>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-soft">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink-primary sm:text-5xl">
            {title}
          </h2>
          <p className="mt-6 font-display text-lg leading-relaxed text-ink-secondary">
            {children}
          </p>
          <p className="mt-6 font-display text-sm text-ink-secondary">{meta}</p>
        </Reveal>

        <Reveal
          group
          className="-mx-5 snap-x snap-mandatory overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0"
        >
          <ul className="mx-auto flex w-max gap-5">
            {shots.map(({ shot, alt }, i) => (
              <li
                key={shot}
                data-reveal-child
                style={{ transitionDelay: `${i * 140}ms` }}
                className="w-[220px] shrink-0 snap-center lg:w-[190px]"
              >
                <PhoneFrame shot={shot} alt={alt} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function TableShowcase() {
  return (
    <Showcase
      id="table"
      eyebrow="At the table"
      title={
        <>
          Score the game,
          <br />
          not a notepad.
        </>
      }
      meta="Bo1 or Bo3 · Optional match clock · Nothing ends until you say so"
      shots={[
        {
          shot: "setup",
          alt: "New match sheet with Best of 3 selected, a 60 minute timed match, player names and a chosen deck",
        },
        {
          shot: "board",
          alt: "Score board mid-game: 5 to 4, a running match clock, and Conquer, Hold and Special buttons for each player",
        },
        {
          shot: "between-games",
          alt: "Between-games screen: You win game 1, 8 to 4, series 1–0, with an option to add a note and start game 2",
        },
      ]}
    >
      Put one phone between you. Tap Conquer, Hold or Special for each point,
      and Riftlog keeps track of the score, the series and the clock.
    </Showcase>
  );
}

export function HistoryShowcase() {
  return (
    <Showcase
      id="history"
      eyebrow="After the match"
      title={
        <>
          Every match.
          <br />
          Every deck.
        </>
      }
      meta="Try it as a guest · Works offline · Only you see your data"
      shots={[
        {
          shot: "history",
          alt: "Match history with All, Wins, Losses and BO3 filters, one match expanded to show three game scores and the deck",
        },
        {
          shot: "match-detail",
          alt: "Match detail: a 2–1 victory played in overtime, per-game score bars, and a score graph for game 3",
        },
        {
          shot: "deck-changes",
          alt: "Show changes on a deck's main deck: Defy marked minus one in red, Rebuke marked plus one in green",
        },
      ]}
    >
      Your history keeps every score, a graph of each game and your notes.
      Import decks from Piltover Archive and see what changed between versions.
    </Showcase>
  );
}
