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
      intro="One phone, two players, a full-screen board. Each side reads its own score the right way up."
      points={[
        {
          title: "Score it how it happened",
          body: "Every point is a Conquer, a Hold or a Special. Tap your number to take one back.",
        },
        {
          title: "A clock for the whole match",
          body: "An optional timer across every game, breaks included. Pause it for a judge call; it runs into overtime instead of cutting you off.",
        },
        {
          title: "Best of one or best of three",
          body: "A between-games screen keeps the series score, and draws are handled. A Bo3 ends as soon as it's decided.",
        },
        {
          title: "You decide when a game ends",
          body: "No auto-finish at 8 and no cap, so a stray tap never closes a game. You end each game and say who won.",
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
          caption: "Set up the format, clock and deck.",
        },
        {
          shot: "board",
          alt: "Riftlog score board mid-game: 5 to 4, a 59:41 match clock, and Conquer, Hold and Special buttons for each player",
          caption: "The board, mid-game, with the match clock.",
        },
        {
          shot: "between-games",
          alt: "Between-games screen: You win game 1, 8 to 4, series 1–0, with an option to add a note and start game 2",
          caption: "Between games in a Bo3.",
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
      intro="Every match you finish is saved to your history: the format, each game's score, how the points came in and the deck you played. Home keeps your own record of wins, losses and win rate."
      points={[
        {
          title: "Find any match",
          body: "Filter by wins, losses or Bo3. Open a row for the game scores, the clock and your deck.",
        },
        {
          title: "The story of each game",
          body: "A score graph for every game, with your line colored by how each point was scored.",
        },
        {
          title: "Notes while it's fresh",
          body: "Jot down a note on each game and on the round, right after playing or any time later.",
        },
        {
          title: "The exact list you played",
          body: "Each match links to the deck version you used, even if you've edited the deck since.",
        },
      ]}
      shots={[
        {
          shot: "history",
          alt: "Match history list with All, Wins, Losses and BO3 filters, one row expanded to show three game scores and the deck",
          caption: "Your history, filterable.",
        },
        {
          shot: "match-detail",
          alt: "Match detail: a 2–1 victory played in overtime, per-game score bars, and a score graph for game 3",
          caption: "Match detail with a game's score graph.",
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
      title="Your decks, version by version"
      intro="Keep your lists in Riftlog, pick one before a match, and see how a deck has changed over time."
      points={[
        {
          title: "Paste and go",
          body: "Import a list from Piltover Archive's text export. Riftlog checks the counts and flags any line it can't read.",
        },
        {
          title: "Every edit is a new version",
          body: "Turn on Show changes to see which cards came in and went out since an earlier version.",
        },
        {
          title: "Pick it before you play",
          body: "Choose your deck when you set up a match, or set a default so it's already picked.",
        },
        {
          title: "Laid out like the game",
          body: "Legend, chosen champion, domains, runes, battlefields, main deck and sideboard, each with its count.",
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
          shot: "deck",
          alt: "Deck view for Kennen Tempo: legend and chosen champion, Chaos and Order domains, rune split, battlefields and main deck",
          caption: "A deck, section by section.",
        },
        {
          shot: "deck-changes",
          alt: "Show changes on a deck's main deck: Defy marked minus one in red, Rebuke marked plus one in green",
          caption: "Show changes between versions.",
        },
        {
          shot: "my-decks",
          alt: "Profile with a default deck and the My decks list, with search and sort",
          caption: "My decks, with search and a default.",
        },
      ]}
    />
  );
}
