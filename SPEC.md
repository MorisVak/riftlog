# Riftlog — Product Spec

Riftlog is a companion app for the Riftbound TCG (Riot Games). It does two
core things: **track scores live while two people play in person**, and
**log every match into a persistent history** players can revisit — with the
decks, scores, and format recorded alongside each game.

This document describes _what_ Riftlog is and what gets built. For _how_ the
project works (stack, conventions, commands, design tokens, Riot policy), see
the `CLAUDE.md` files. Where the two overlap (e.g. Riftbound terminology, the
binding Riot policy), `CLAUDE.md` is the source of truth and this spec defers
to it.

## Goals

- Be the fastest way to keep score during an in-person Riftbound match.
- Give players a durable, browsable record of the games they've played.
- Let players attach the deck they ran to each match, and see how a deck
  changed over time.
- Sync history to the cloud across a player's devices. The in-person tracker
  stays usable offline, but saving a match requires an account.

## Non-goals

- No metagame analytics across users (win rates by deck/card, matchup tables,
  play rates). This is both out of scope and prohibited by Riot policy. A user
  seeing **their own** stats is fine; cross-user aggregation is not.
- No real-time online play. Riftlog records in-person games; it is not a way
  to play the game itself.
- No social feed, comments, or public profiles in v1.
- No local on-device match storage in v1. History lives in the cloud;
  matches played offline or signed-out are not saved (by design — to avoid
  cluttering devices).

## Core concepts

These follow Riftbound's own terminology (see `CLAUDE.md` for the full
glossary). The ones that matter for the product:

- **Match** — a Bo1 or Bo3 sequence of games between two players.
- **Game** — a single game within a match. In Riftbound a game is won by
  reaching a target score (8, +1 per **Aspirant's Climb** Battlefield in
  play), but **Riftlog does not enforce this** — it's a manual tally. The
  player decides when a game is over and ends it explicitly. Score has no
  upper bound and no auto-end; the only rule is it can't drop below 0.
- **Deck** — what a player brought. Stored per match as an immutable
  **snapshot**, so a match always reflects the exact list played even if the
  deck is later edited or deleted.

A Riftbound deck is structured as: a chosen **Champion**, a **Legend**, a
**40-card main deck**, **12 Runes**, **3 Battlefields**, and an **8-card
sideboard**.

## Data model

The domain types live in `@riftlog/core` (`Match`, `Game`, `Player`,
`DeckSnapshot`). They already exist and are well-shaped; the work is mostly
writing the logic that drives them. Things to know:

1. **Match resolution is modelled but not yet implemented.** `Game` has
   `scoresAtEnd`, `winnerId`, `endedAt`; `Player` has `gameWins`; `Match` has
   `winnerId` and `endedAt`. None of these are currently written by the app —
   live score sits on `Player.gameScore` and nothing freezes a result. The
   match-lifecycle behavior in Feature 1 defines exactly when and how these
   get set. This is the single most important behavior to get right, because
   the entire win/loss/draw result system depends on it.

2. **`DeckSnapshot` is currently generic** (`cards[]`, optional `legend`,
   optional `sideboard`). When full decklists ship (Feature 6), it needs to
   model the Riftbound sections explicitly — champion, legend, main, runes,
   battlefields, sideboard — rather than a flat card list.

3. **Timed mode is not in the data model.** It needs new fields — e.g. on
   `Match`, whether the match is timed and the configured duration (applied to
   the Bo1, or to the whole Bo3). Live clock state (remaining time,
   running/paused) likely lives in context rather than the persisted model.
   Decide what persists to history (configured duration, whether time expired)
   versus what's ephemeral. The clock pauses between games in a Bo3.

Forward-compatible fields already in the model (`Player.userId`,
`Player.deck`, `Match.hostUserId`, `Match.guestUserIds`, `Match.notes`,
`Match.tags`) exist on purpose for the features below. Don't remove them.

---

## Feature 1 — Live score tracking

**Status:** partially built. The playboard renders two players with
increment/decrement scoring (`PlayField` → `TrackingField` →
`ScoringComponent`), backed by `matchContext`. Pre-match setup, the end-game
prompt, match resolution, and Bo3 flow are not built. Timed mode is not built.

**What it is.** The default screen. Two players, two scores, tap to count up
as the game is played in person. The tab bar hides during an active match so
the board is full-screen. Scoring is a deliberate manual tally: nothing
auto-ends, so stray or meme taps never close a game — the player always ends
games and the match themselves.

**Match lifecycle (the core behavior to implement):**

1. **Pre-match setup.** Before a match starts, the player picks format
   (Bo1 / Bo3) and player names. Later this also includes deck selection
   (Feature 4). The player can also toggle **timed game** and choose a time
   for the Bo1 or Bo3; a clock then counts down during play and pauses between
   games in a Bo3. Timed mode is not yet implemented or in the data model.
   (Today `startMatch()` skips setup entirely and uses defaults — the setup UI
   replaces that.)
2. **During a game.** `incrementScore` / `decrementScore` / `setScore` adjust
   `Player.gameScore`. Scores can't go below 0; there is no upper bound and no
   auto-end at any value — reaching 8 (or any number) does nothing on its own.
3. **Claim victory / end of game.** When a player ends the current game, a
   prompt confirms the intent. On confirm, the current `Game` is frozen:
   `scoresAtEnd` is copied from the players' live scores, `winnerId` is set,
   `endedAt` is stamped, and the winner's `Player.gameWins` increments. Then,
   depending on format and standings, it either ends the match (Bo1, or the
   2nd win in a Bo3) and routes to the match overview (the history detail view
   for that match), or advances to the next game.
4. **Advance (Bo3).** If neither player has reached 2 game wins, a new `Game`
   is created and `currentGameIndex` advances; a between-games screen shows
   the match score (e.g. "1–0") before the next game. If a player has 2 wins,
   the match is decided.
5. **Match end.** When the match is decided (Bo1: one game; Bo3: 2 game
   wins), `Match.winnerId` and `Match.endedAt` are set and the completed match
   is saved to history (Feature 2/3). A draw is possible where the format
   allows it; record it as a draw rather than forcing a winner.

**Note:** `endMatch()` currently discards the match. Once cloud persistence
exists, completing a match saves it to Supabase when the user is signed in;
only an explicit "abandon/discard" should throw it away. A match completed
while signed-out is not saved in v1.

**Designed setup sheet (forward-looking).** Pre-match setup is designed as a
bottom sheet titled "New match" (from Claude Design), containing top to bottom:
a grab handle, a **Format** segmented toggle (Best of 1 / Best of 3), a **Your
deck** carousel, an **Opponent name** input, a **Scan QR** button shown with a
"SOON" teaser state, a **Track turns** toggle, and a **Start match** button.

v1 builds only **Format + player names + Start**. The design's single
"Opponent" field assumes a logged-in "You"; until auth exists the model has two
symmetric players, so v1 renders **two name inputs** (Player 1 / Player 2),
styled like the design's input. The remaining elements are designed and
recorded here so they slot onto this same sheet when their features land:

- **Your deck** carousel → deck selection entry point (Feature 4).
- **Scan QR ("SOON")** → match-mode teaser (Feature 8). The disabled "SOON"
  affordance could ship earlier than the feature itself (see open questions).
- **Track turns** toggle → turn tracking (Feature 10); not in the data model.

The designed sheet has **no** timed-game control, whereas the lifecycle above
describes a timed-game toggle — these need reconciling (see open questions).

---

## Feature 2 — Match history

**Status:** planned. Data model exists; no UI. Reads from cloud persistence
(Feature 3).

**What it is.** A browsable list of completed matches, newest first. Tapping a
match opens a detail view.

**List item shows:** date, result (W/L/D from the owner's perspective, with the
letter badge + colored bar), format (Bo1/Bo3), final game score, and the deck
played (once decks ship).

**Detail view shows:** per-game breakdown (score at end, winner), format,
the deck snapshot, and any notes/tags. Because the
deck is stored as an immutable snapshot, the detail always reflects the exact
list played. The match-end flow in Feature 1 routes here as the overview.

**Result perspective.** History is owner-centric: results render as win / loss
/ draw relative to the owning player, always pairing color with the W/L/D
letter badge and colored left bar (never color alone).

---

## Feature 3 — Cloud persistence

**Status:** planned, prioritized — built early, alongside auth. State is
in-memory only today.

**What it is.** Completed matches are saved to **Supabase** so a player's
history syncs across their devices and survives reinstalls. Supabase is the
single source of truth for history.

There is deliberately **no local / on-device store in v1** (to avoid
cluttering devices). The consequence: a match played while signed-out or
offline is **not saved** in v1. The live tracker still works offline — only
saving requires an account and connection.

**Requirements:**

- Requires auth (a user identity to own match rows) — see Feature 7.
- `matches` table mirrors the `Match` type from `@riftlog/core`.
- RLS so a user can only read/write their own matches.

---

## Feature 4 — Deck import

**Status:** planned. `DeckSnapshot` type exists; no parsers, no import UI.

**What it is.** Players import a deck into Riftlog so they can attach it to
matches and review it later. Import sources, in priority order: **Piltover
Archive**, then **Riftmana**, then **manual** entry. Imported decks are stored
as decks the player owns; attaching one to a match captures an immutable
snapshot at that moment.

**Entry point:** the **Your deck** carousel on the pre-match setup sheet
(Feature 1), where the player picks which owned deck they're running for the
match before starting it.

**Requirements:**

- Parse a deck from a source URL into the structured Riftbound sections.
- Respect third-party site rate limits; don't hammer Piltover Archive /
  Riftmana.
- Parsers belong in `@riftlog/core` (`parsers/piltover.ts`, etc.) as pure
  functions — no platform or network code in core; the app does the fetching
  and hands raw input to the parser.

---

## Feature 5 — Deck versioning & change snapshots

**Status:** planned. Depends on Features 3 and 4.

**What it is.** When a player edits a deck they've already used and plays a new
game with the updated list, Riftlog records a new version. The history then
shows a **diff snapshot** — what changed between the previous version and the
one first played in that game (cards added/removed, quantity changes,
section changes).

**Why it works:** each match already stores an immutable `DeckSnapshot`, so
comparing the snapshot on game N against the snapshot on game N+1 yields the
diff. The diff logic (`diffDecks`) is a pure function in `@riftlog/core`.

---

## Feature 6 — Decklists & card art

**Status:** deferred — blocked on a Riot API key (not yet obtained).

**What it is.** Viewing a decklist shows the actual card arts, broken into the
standard Riftbound sections: chosen Champion, Legend, 40-card main deck,
12 Runes, 3 Battlefields, 8-card sideboard.

**Dependencies & notes:**

- Requires a production API key from developer.riotgames.com for card data /
  imagery.
- `DeckSnapshot` needs extending to model the sections explicitly (see Data
  model note 2).
- Until the key exists, decklists can render structurally (names, quantities,
  sections) without art — art is a later enhancement, not a blocker for the
  rest of deck features.
- Any use of Riftbound imagery carries the fan-made disclaimer (see Riot
  policy in `CLAUDE.md`).

---

## Feature 7 — Profile

**Status:** planned. Comes with auth (Supabase), which is pulled forward to
support cloud persistence.

**What it is.** A profile screen with a username (and later a profile picture).
From here the player imports decks and reviews their decklists. The profile is
where a player's owned decks live, distinct from the per-match snapshots.

**Notes:** username is the first piece; profile picture is explicitly "for
later." Auth (Supabase magic links) is the dependency — and since cloud
persistence needs an account, auth lands early rather than late.

---

## Feature 8 — Match mode (QR co-recording)

**Status:** deferred to v2. Forward-compatible fields exist
(`Match.hostUserId`, `Match.guestUserIds`).

**What it is.** When both players have the app and want a shared record, one
player surfaces a QR code and the other scans it to join or receive the match,
so both end up with the game in their history.

**Open design:** the exact mechanism (transfer a finished match vs. both
co-record live vs. one hosts and the other joins) is undecided. Depends on
auth and likely Supabase realtime. Treat as exploratory — the data model
reserves space for it but nothing should be built until v1 is solid.

**Designed entry point:** the pre-match setup sheet (Feature 1) includes a
**Scan QR** button shown with a "SOON" teaser state. The disabled teaser could
ship in v1 to surface the upcoming feature, even though the functionality is
v2 (see open questions).

---

## Feature 9 — Friends

**Status:** exploratory, far future.

**What it is.** A "friends" tab of already-connected players, so match mode can
pick a known buddy instead of scanning a QR each time. Noted for direction
only; no design or model work yet.

---

## Feature 10 — Turn tracking

**Status:** exploratory / deferred. Not in the data model.

**What it is.** An optional **Track turns** toggle on the pre-match setup sheet
(Feature 1). When on, Riftlog tracks turns during a game — e.g. whose turn it
is and/or a turn counter — alongside the score. Distinct from timed mode: this
counts turns, not time.

**Notes:** needs new model/runtime state (turn count, active player) and a
decision on what, if anything, persists to history. Designed as a toggle on the
setup sheet but not built or modelled. The designed sheet shows Track turns and
no timed control, while Feature 1's lifecycle describes a timed-game toggle —
reconcile the two (see open questions).

---

## Roadmap (suggested build order)

Each step should be a working, committed slice before the next begins —
matching the incremental philosophy in `CLAUDE.md`.

1. **Design tokens in code** — Archive Periwinkle wired into
   `tailwind.config.js`; retoken existing inline colors. _(Done / in progress.)_
2. **Match lifecycle** — pre-match setup (format, names, timed-mode toggle),
   end-game prompt, game resolution, Bo3 advance, match end. Includes adding
   the timed-mode fields and using the resolution fields in the data model.
   (Feature 1.) The keystone everything else needs.
3. **Auth + cloud persistence** — Supabase auth (magic link) and a `matches`
   table with RLS; completed matches save to the cloud. Pulled forward because
   history depends on it and there's no local store. (Features 3 + 7 username.)
4. **Match history** — list + detail reading from the cloud. (Feature 2.)
5. **Profile** — username (avatar later); owned decks live here. (Feature 7.)
6. **Deck import** — Piltover Archive parser first, attach decks to matches.
   (Feature 4.)
7. **Deck versioning & diffs** — version on edit, show change snapshots.
   (Feature 5.)
8. **Card art decklists** — once the Riot API key lands. (Feature 6.)
9. **Match mode (QR)** — v2. (Feature 8.)
10. **Turn tracking** — exploratory. (Feature 10.)
11. **Friends** — exploratory. (Feature 9.)

## Constraints

- **Riot policy is binding** (full text in `CLAUDE.md`). Product implications:
  no cross-user metagame aggregation; a user's own stats only; free tier if
  any monetization exists; paid content must be transformative; fan-made
  disclaimer wherever Riftbound assets/trademarks appear.
- **Cloud-backed history.** The live tracker works offline, but saving a match
  requires an account and connection; in v1, offline/signed-out matches are
  not saved (no local store, by design).
- **Accessibility.** Result states (win/loss/draw) never rely on color alone —
  always a W/L/D letter badge plus a colored left bar.
- **Motion.** Animations use React Native Reanimated (details in the mobile
  `CLAUDE.md`).

## Open questions

- **Timed mode** — what happens when the clock reaches zero? Auto-end the game
  or match, and how is the result decided (current score wins? sudden death?)?
  What persists to history (configured duration, whether time expired)?
- **Track turns vs. timed mode** — the designed setup sheet has a **Track
  turns** toggle and no timed-game control, but Feature 1's lifecycle describes
  a **timed-game** toggle. Decide which the pre-match toggle actually is —
  turn tracking, timed game, or both — and which you want first.
- **Scan QR "SOON" teaser** — should the disabled Scan QR affordance ship in v1
  as a teaser for the v2 match-mode feature, or stay out entirely until v2?
- **`Player.xp`** exists in the model but has no defined product meaning.
  Decide what it represents (a gamification/progression idea?) or remove it.
- **Draws** — which formats/situations can end in a draw, and how is that
  surfaced in scoring and history?
- **Match mode mechanism** — transfer vs. co-record vs. host/join (Feature 8).
- **Deck ownership vs. snapshots** — confirm the relationship between a
  player's editable owned decks and the immutable per-match snapshots in the
  profile UI.
