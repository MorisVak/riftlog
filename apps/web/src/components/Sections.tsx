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
      points={[
        {
          title: "Legends on the board",
          body: "Pick both legends in setup. Each half of the board shows its player's legend, and every game opens with a face-off.",
        },
        {
          title: "Score each point",
          body: "Tap Conquer, Hold or Special. A mis-tap? Tap the score to take it back.",
        },
        {
          title: "Match clock",
          body: "One optional timer for the whole match. Pause it anytime. At zero it counts into overtime.",
        },
        {
          title: "Bo1 or Bo3",
          body: "Riftlog tracks the series and ends it once there's a winner. Between games you see the series and can note what happened.",
        },
        {
          title: "You end the game",
          body: "Tap the winner. Nothing ends on its own, so a stray tap can't finish a game.",
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
          alt: "New match sheet: Riven against Akali, player names, the Rivon deck, Best of 3 and a 30 minute clock",
          caption: "Match setup",
        },
        {
          shot: "board",
          alt: "The score board mid-game: 5 to 3, Riven behind your half and Akali behind theirs, with Conquer, Hold and Special under each score",
          caption: "Score board",
        },
        {
          shot: "who-won",
          alt: "Who won game 1? Riven on 8 and Akali on 5, tap the winner, with Draw and Keep playing below",
          caption: "Ending a game",
        },
        {
          shot: "between-games",
          alt: "Between games: game 1 won 8–5, the series at 1–0, a game note and Start game 2",
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
      intro="Finished matches are saved to your history. Home shows how your last ten went at a glance."
      points={[
        {
          title: "Home at a glance",
          body: "Your default deck, your last ten results and your newest matches.",
        },
        {
          title: "Search and filter",
          body: "By opponent, result, format, date, your deck, or either legend.",
        },
        {
          title: "Score graphs",
          body: "See how each game played out, point by point.",
        },
        {
          title: "Notes",
          body: "Add a note to any game or match, now or later.",
        },
      ]}
      shots={[
        {
          shot: "home",
          alt: "Home: the Rivon deck behind Start a match, the last ten results at 7–3, the newest matches and the decks",
          caption: "Home",
        },
        {
          shot: "history",
          alt: "Match history: each row with its result, opponent, format, deck and score, over the art of the legend played",
          caption: "Match history",
        },
        {
          shot: "history-filters",
          alt: "Filter sheet: result, format, date, your deck, your legend and their legend, with Wins, Best of 1 and Riven picked",
          caption: "Filters",
        },
        {
          shot: "match-detail",
          alt: "Match detail: a 2–1 victory of Riven against Miss Fortune, per-game score bars and a score graph for game 3",
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
      intro="Import your lists, see them as real cards and watch them change over time."
      points={[
        {
          title: "Import your lists",
          body: "Paste a decklist or a deck code. Riftlog checks the card counts for you.",
        },
        {
          title: "Every edit is saved",
          body: "Each edit creates a new version. Show changes highlights what's in and what's out.",
        },
        {
          title: "Your default deck",
          body: "Set it once. It's on Home and picked for every new match.",
        },
        {
          title: "Your legend art",
          body: "Prefer the overnumbered art, or pick each legend's art yourself. It shows everywhere, decklists included.",
        },
      ]}
      footnote={
        <div className="flex flex-wrap gap-2">
          <Swatch className="bg-added" label="Added" />
          <Swatch className="bg-cut" label="Cut" />
        </div>
      }
      shots={[
        {
          shot: "decks",
          alt: "Decks: five decks, each over its legend's art, with domains and the date it was updated",
          caption: "Your decks",
        },
        {
          shot: "deck",
          alt: "The Rivon deck: legend and chosen champion, Chaos and Calm, the rune split, battlefields and the main deck",
          caption: "Deck view",
        },
        {
          shot: "deck-gallery",
          alt: "The same deck as a gallery of card images, each with its count",
          caption: "Gallery",
        },
        {
          shot: "legend-art",
          alt: "Legend art settings: prefer overnumbered art, use it in decklists, and every legend with the art it shows",
          caption: "Legend art",
        },
      ]}
    />
  );
}
