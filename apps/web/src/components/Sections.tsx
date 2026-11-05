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
      intro="Put one phone between you two. Riftlog keeps score and shows who's playing who."
      footnote={
        <div className="flex flex-wrap gap-2">
          <Swatch className="bg-conquer" label="Conquer" />
          <Swatch className="bg-hold" label="Hold" />
          <Swatch className="bg-special" label="Special" />
        </div>
      }
      tiles={[
        {
          title: "Legends on the board",
          body: "Pick both legends in setup. Each half of the board shows its player's legend, and every game opens with a face-off.",
          detail: "setup-legends",
          alt: "New match: Riven, from the Rivon deck, against Akali",
        },
        {
          title: "Score each point",
          body: "Tap Conquer, Hold or Special. A mis-tap? Tap the score to take it back.",
          detail: "board-score",
          alt: "Your half of the board: 5 points, with Conquer, Hold and Special under it and End below",
        },
        {
          title: "Bo1 or Bo3, with a clock",
          body: "Riftlog tracks the series and ends it once there's a winner. One optional clock covers the whole match. Pause it anytime; at zero it counts into overtime.",
          detail: "setup-format",
          alt: "Format and clock in setup: Best of 3 and 30 minutes picked",
        },
        {
          title: "You end the game",
          body: "Tap the winner. Nothing ends on its own, so a stray tap can't finish a game.",
          detail: "who-won",
          alt: "Who won game 1? Riven on 8 and Akali on 5, with Draw and Keep playing below",
        },
        {
          title: "Between games",
          body: "See the game just played and the series so far, and note what happened.",
          detail: "between",
          alt: "Between games: game 1 won 8–5, the series at 1–0 and a field for a game note",
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
      intro="Finished matches are saved to your history. Home shows how your last ten went at a glance."
      tiles={[
        {
          title: "Home at a glance",
          body: "Your last ten results and your newest matches, right under Start a match.",
          detail: "home-matches",
          alt: "Your matches on Home: the last ten results at 7–3 and the four newest matches",
        },
        {
          title: "Search and filter",
          body: "By opponent, result, format, date, your deck, or either legend.",
          detail: "filters",
          alt: "Filter sheet: Wins, Best of 1 and Riven picked, with deck and legend filters",
        },
        {
          title: "Your history",
          body: "Every match with its result, opponent, format, deck and score, over the legend you played.",
          detail: "history-rows",
          alt: "History rows: wins and losses against Ben, Lea, Alex and Ida, each over the legend played",
        },
        {
          title: "Score graphs",
          body: "See how each game played out, point by point.",
          detail: "graph",
          alt: "Games card of a 2–1 match, with the score graph of game 3",
        },
        {
          title: "Notes",
          body: "Add a note to any game or match, now or later.",
          detail: "notes",
          alt: "Note fields for the round and each game",
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
      intro="Import your lists, see them as real cards and watch them change over time."
      tiles={[
        {
          title: "Import your lists",
          body: "Paste a decklist or a deck code. Riftlog checks the card counts for you.",
          detail: "decks-list",
          alt: "Decks: Rivon, Ahri Control and Jinx Aggro, each over its legend's art with its domains",
        },
        {
          title: "Real cards",
          body: "See a deck as a list or as a gallery of its cards, with counts.",
          detail: "gallery",
          alt: "A deck as a gallery of card images, each with its count",
        },
        {
          title: "Card details",
          body: "Tap a card for its art, stats and text.",
          detail: "card",
          alt: "Card details for Riven, Broken Blade: a showcase printing with its type, rarity and domain",
        },
        {
          title: "Your default deck",
          body: "Set it once. It's on Home and picked for every new match.",
          detail: "default-deck",
          alt: "Home's default deck card: Rivon, with Change and Start a match",
        },
        {
          title: "Your legend art",
          body: "Prefer the overnumbered art, or pick each legend's art yourself. It shows everywhere, decklists included.",
          detail: "legend-art",
          alt: "Legend art settings: prefer overnumbered art, use it in decklists, and a grid of legends",
        },
        {
          title: "Every edit is saved",
          body: (
            <>
              Each edit creates a new version. Show changes marks what&apos;s{" "}
              <span className="font-semibold text-added">added</span> and what&apos;s{" "}
              <span className="font-semibold text-cut">cut</span>.
            </>
          ),
        },
      ]}
    />
  );
}
