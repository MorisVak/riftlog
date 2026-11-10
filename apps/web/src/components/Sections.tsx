import { Beat } from "./Beat";

/** Beat 1: your decks and the match setup. */
export function BeforeSection() {
  return (
    <Beat
      id="before"
      eyebrow="Before the match"
      title="Ready in seconds"
      intro="Bring your lists in once, then start a match with a couple of taps."
      points={[
        {
          title: "Import your lists",
          body: "Paste a decklist or a deck code. Riftlog checks the card counts for you.",
        },
        {
          title: "Every edit is saved",
          body: "Each edit is a new version, and you can see what went in and out.",
        },
        {
          title: "Set up a match",
          body: "Pick both legends, Bo1 or Bo3 and an optional clock. Your default deck is already picked.",
        },
      ]}
      shots={[
        {
          shot: "deck",
          alt: "The Rivon deck: legend and chosen champion, Chaos and Calm, the rune split, battlefields and the main deck",
          caption: "Your deck",
        },
        {
          shot: "setup",
          alt: "New match sheet: Riven against Akali, player names, the Rivon deck, Best of 3 and a 30 minute clock",
          caption: "Match setup",
        },
      ]}
    />
  );
}

/** Beat 2: at the table (the board itself, in both modes, is the hero). */
export function TableSection() {
  return (
    <Beat
      id="table"
      flip
      eyebrow="At the table"
      title="One phone between you"
      intro="Each half of the board belongs to one player, with their legend behind the score."
      points={[
        {
          title: "Detailed or simple",
          body: "Score each point as Conquer, Hold or Special, or keep a plain + / − count. Pick one in your profile, and try both at the top of this page.",
        },
        {
          title: "Take it back",
          body: "A mis-tap? Tap the score, or − on the simple board, to undo the last point.",
        },
        {
          title: "You end the game",
          body: "Tap the winner, so a stray tap can't end it. In a Bo3, Riftlog tracks the series.",
        },
      ]}
      shots={[
        {
          shot: "who-won",
          alt: "Who won game 1? Riven on 8 and Akali on 5, tap the winner, with Draw and Keep playing below",
          caption: "Ending a game",
        },
      ]}
    />
  );
}

/** Beat 3: history and the match detail. */
export function AfterSection() {
  return (
    <Beat
      id="after"
      eyebrow="After the match"
      title="Every match, kept"
      intro="Finished matches are saved to your history, ready when you want to look back."
      points={[
        {
          title: "Search and filter",
          body: "By opponent, result, format, date, your deck or either legend.",
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
          shot: "history",
          alt: "Match history: each row with its result, opponent, format, deck and score, over the art of the legend played",
          caption: "Match history",
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
