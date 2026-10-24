import { ImageOff } from "lucide-react";
import { FeatureSection } from "./FeatureSection";

/** A labelled color dot, mirroring the app's legends. Color is never the only signal. */
function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-display text-sm text-ink-secondary">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

export function ScoreboardSection() {
  return (
    <FeatureSection
      id="scoreboard"
      eyebrow="At the table"
      title="Built for the table"
      intro="Put one phone between you two. Riftlog keeps score."
      points={[
        {
          title: "Score each point",
          body: "Tap Conquer, Hold or Special. Tap the score to undo.",
        },
        {
          title: "Match clock",
          body: "One optional timer for the whole match. Pause it anytime. At zero it counts into overtime.",
        },
        {
          title: "Bo1 or Bo3",
          body: "Riftlog tracks the series and ends it once there's a winner. Draws count too.",
        },
        {
          title: "You end the game",
          body: "Nothing ends automatically, so a stray tap can't finish a game.",
        },
      ]}
      footnote={
        <div className="flex flex-wrap gap-2">
          <Swatch className="bg-conquer" label="Conquer" />
          <Swatch className="bg-hold" label="Hold" />
          <Swatch className="bg-special" label="Special" />
        </div>
      }
      shots={[
        {
          shot: "setup",
          alt: "New match sheet with Best of 3 selected, a 60 minute timed match, player names and a chosen deck",
          caption: "Match setup",
        },
        {
          shot: "board",
          alt: "Riftlog score board mid-game: 5 to 4, a 59:41 match clock, and Conquer, Hold and Special buttons for each player",
          caption: "The score board",
        },
        {
          shot: "between-games",
          alt: "Between-games screen: You win game 1, 8 to 4, series 1–0, with an option to add a note and start game 2",
          caption: "Between games",
        },
      ]}
    />
  );
}

export function HistorySection() {
  return (
    <FeatureSection
      id="history"
      eyebrow="After the match"
      title="Every match, kept"
      intro="Finished matches are saved to your history. Home shows your wins, losses and win rate."
      points={[
        {
          title: "Filter your history",
          body: "Show only wins, losses or Bo3 matches.",
        },
        {
          title: "Score graphs",
          body: "See how each game played out, point by point.",
        },
        {
          title: "Notes",
          body: "Add a note to any game or match, now or later.",
        },
        {
          title: "The deck you played",
          body: "Each match links to the exact version of your deck.",
        },
      ]}
      shots={[
        {
          shot: "history",
          alt: "Match history list with All, Wins, Losses and BO3 filters, one row expanded to show three game scores and the deck",
          caption: "Match history",
        },
        {
          shot: "match-detail",
          alt: "Match detail: a 2–1 victory played in overtime, per-game score bars, and a score graph for game 3",
          caption: "Match details",
        },
      ]}
    />
  );
}

export function DecksSection() {
  return (
    <FeatureSection
      id="decks"
      eyebrow="Your decks"
      title="Every list, every version"
      intro="Import your lists and see how they change over time."
      points={[
        {
          title: "Import from Piltover Archive",
          body: "Paste the text export. Riftlog checks the card counts for you.",
        },
        {
          title: "Every edit is saved",
          body: "Each edit creates a new version. Show changes highlights what's in and what's out.",
        },
        {
          title: "Pick a deck per match",
          body: "Choose it in match setup, or set a default.",
        },
        {
          title: "Sorted like the game",
          body: "Legend, champion, runes, battlefields, main deck and sideboard.",
        },
      ]}
      footnote={
        <>
          <div className="flex flex-wrap gap-2">
            <Swatch className="bg-added" label="Added" />
            <Swatch className="bg-cut" label="Cut" />
          </div>
          <p className="mt-5 flex gap-3 font-display text-[15px] leading-relaxed text-ink-secondary">
            <ImageOff
              aria-hidden
              size={18}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-accent-soft"
            />
            Decklists are text for now. Waiting on Riot&apos;s approval.
          </p>
        </>
      }
      shots={[
        {
          shot: "deck",
          alt: "Deck view for Kennen Tempo: legend and chosen champion, Chaos and Order domains, rune split, battlefields and main deck",
          caption: "Deck view",
        },
        {
          shot: "deck-changes",
          alt: "Show changes on a deck's main deck: Defy marked minus one in red, Rebuke marked plus one in green",
          caption: "Show changes",
        },
        {
          shot: "my-decks",
          alt: "Profile with a default deck and the My decks list, with search and sort",
          caption: "My decks",
        },
      ]}
    />
  );
}
