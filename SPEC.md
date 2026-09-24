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
  works offline; a match recorded offline is saved to the cloud automatically
  once a connection returns.

## Non-goals

- No metagame analytics across users (win rates by deck/card, matchup tables,
  play rates). This is both out of scope and prohibited by Riot policy. A user
  seeing **their own** stats is fine; cross-user aggregation is not.
- No real-time online play. Riftlog records in-person games; it is not a way
  to play the game itself.
- No social feed, comments, or public profiles in v1.
- No locally-mirrored match **history**. History lives in the cloud and is read
  on demand; the device never keeps a growing on-device copy of past matches.
  (Bounded offline state — the single in-progress match and a small outbox of
  unsynced completed matches — is kept and self-clears; see Feature 3.)

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
**40-card main deck** (the chosen champion counts toward it), **12 Runes**,
**3 Battlefields**, and a **sideboard** (SPEC originally said 8 cards;
Piltover Archive currently shows decks with 10, so Riftlog shows the sideboard
as a plain count and never checks its size).

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

2. **Decks are modelled by section.** A `DeckList` holds `legend`,
   `champion`, `main`, `battlefields`, `runes`, `sideboard` (and
   `additionalLegends`, not in the game yet and hidden while empty) as
   `CardRef { name, code, count }`. `main` **excludes the chosen-champion
   copy**, matching the text export: 39 + the champion = 40. `code` is null for
   text imports; later it holds the full printing code (e.g. `SFD-149a`).
   `DeckSnapshot` carries a `DeckList` plus the `deckId` / `versionId` it was
   taken from, so a match can pin the exact immutable version played.

3. **Timed mode is in the data model** — one field, `Match.timeLimitSeconds`
   (`null` = untimed), mirrored by `matches.time_limit_seconds`. One clock
   covers the whole match (the Bo1's game or the entire Bo3) and **never
   pauses**: the between-games break is sideboarding time and is played on the
   same clock. There is no live clock state anywhere — remaining time is derived
   from wall-clock (`limit - (now - game 1 startedAt)`, see
   `apps/mobile/lib/clock.ts`), so it survives backgrounding, a JS reload, and
   an outbox restore. History stores only the configured limit; how long the
   match ran, and so whether it went to overtime, is derived from
   `started_at`/`ended_at`.

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
   (Feature 4). The player can also toggle **timed game** and choose a round
   length; one clock then counts down for the whole match — it keeps running
   between games in a Bo3 (sideboarding is on the clock) and past zero into
   overtime. Built: format, names, and the timed toggle + presets.
2. **During a game.** `incrementScore` / `decrementScore` / `setScore` adjust
   `Player.gameScore`. Scores can't go below 0; there is no upper bound and no
   auto-end at any value — reaching 8 (or any number) does nothing on its own.
3. **Claim victory / end of game.** When a player ends the current game, a
   prompt confirms the intent. On confirm, the current `Game` is frozen:
   `scoresAtEnd` is copied from the players' live scores, `winnerId` is set,
   `endedAt` is stamped, and the winner's `Player.gameWins` increments. Then,
   depending on format and standings, it either ends the match (see "Match
   end" below) and routes to the match overview (the history detail view for
   that match), or advances to the next game.
4. **Advance (Bo3).** If the series isn't decided, a new `Game` is created and
   `currentGameIndex` advances; a between-games screen shows the match score
   (e.g. "1–0") before the next game.
5. **Match end.** A Bo1 ends after its single game. A Bo3 ends on any of:
   a player reaching **2 game wins**; the **3rd game** being played (the format
   cap); or a **drawn game while someone leads** — see Draws below. On end,
   `Match.winnerId` and `Match.endedAt` are set and the completed match is
   saved to history (Feature 2/3). A settled Bo3 may therefore hold only two
   games.
6. **Draws.** A game ends in a draw by the players declaring it (the third
   option on the end-game prompt); it freezes with `winnerId: null` and
   increments nobody's `gameWins`. Because a drawn game can't be replayed and
   yields no win, it **settles the series in favour of whoever is ahead**:
   1–0 followed by a drawn game 2 is a match win for the player who took game
   1, with no game 3. At level standings there's still something to decide, so
   an opening draw or a draw at 1–1 plays on to the format cap; a series still
   level at the cap is recorded as a **match draw** rather than forcing a
   winner. Same rule for the manual "end round now" escape hatch: the leader
   takes it, level standings are a draw.

**Note:** completing a match saves it to Supabase **when signed in**; only an
explicit "abandon/discard" (`endMatch()`) throws it away. A match completed
offline is queued locally and uploaded automatically on reconnect — see
Feature 3. A **guest** match is never saved at all: see Feature 11.

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

The designed sheet has **no** timed-game control; the built sheet adds one
(checkbox + round-length presets) per the lifecycle above. **Track turns** is
still unbuilt — the two are separate toggles, not alternatives.

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

**Status:** built (online path + offline outbox). The `matches`/`games` schema
with RLS is live. Requires a signed-in account — see Feature 11.

**What it is.** Completed matches are saved to **Supabase** so a player's
history syncs across their devices and survives reinstalls. **Postgres is the
single source of truth** for match data.

**Offline-tolerant model.** The device keeps only two bounded things, and both
self-clear:

1. the **single in-progress match** (so an interrupted round survives the app
   being killed/restarted), and
2. a small **outbox** of completed-but-unsynced matches.

On completion the app writes to Postgres directly; if that fails (offline) the
match goes to the outbox, which flushes automatically on reconnect (and on app
foreground / after the next successful write). Once uploaded, the entry leaves
the outbox. Match **history is never mirrored locally** — it's read from
Postgres on demand. So a match recorded offline IS saved — just deferred until a
connection returns.

**Requirements:**

- Auth provides a user identity to own match rows. Persistence is **account
  only** — a signed-out player gets the guest sandbox and no saved history
  (Feature 11). There is no anonymous sign-in.
- `matches` (the Bo1/Bo3 series) and `games` (the games within it) tables, with
  RLS so a user can only read/write their own rows. The DB never re-derives
  Bo3/draw logic — it stores only outcomes the client has already settled.

---

## Feature 4 — Deck import

**Status:** plain-text import built (paste → live preview → save), plus a
deck detail view and a bare "My decks" list on Profile. Piltover Archive deck
**codes** are recognised but not decoded ("coming soon"). Riftmana, manual
entry, and attaching decks to matches are not built.

**What it is.** Players import a deck into Riftlog so they can attach it to
matches and review it later. Import sources, in priority order: **Piltover
Archive**, then **Riftmana**, then **manual** entry. Imported decks are stored
as decks the player owns; attaching one to a match will pin an immutable
version of it.

**Plain-text import (built).** The player pastes Piltover Archive's
*Export → Text* output (or taps "Paste from clipboard"). The parser is
forgiving: headers in any case, with or without a colon (`MainDeck` /
`Main Deck` / `Main`, `Sideboard` / `Side Deck`, `Legend` / `Legends`, …),
`3 Name` or `3x Name`, blank lines and stray whitespace; duplicate lines in a
section merge. The preview shows every section with its total and each problem
next to the line it came from:

- **Errors** (a line that couldn't be read, an unknown section, a card before
  any header) block saving, so nothing pasted silently disappears.
- **Warnings** (wrong main / rune / battlefield count, a missing legend or
  champion) never block. The sideboard size is never checked.

The deck name defaults to the legend's champion ("Kennen") and is editable.

**Deck codes (not built).** The import screen shows a disabled "Deck code —
Coming soon" option. A pasted code gets a friendly note pointing to
*Export → Text* instead of parse errors.

**Deck view (built).** Laid out like Piltover Archive's: the legend and chosen
champion side by side as the deck's identity with its domains (derived from
rune names, e.g. "Chaos Rune" → Chaos; hidden if the names don't match), then
runes (split + a proportion bar in domain colors, x/12), battlefields (x/3),
the main deck (x/40, chosen champion first and tagged), and the sideboard
(plain count). Text only until card art exists (Feature 6).

**Storage.** A deck is a named thing the player owns; its list lives in
**immutable versions**. Saving creates the deck and its first version
together. The name can be changed any time from the deck screen (renaming
never touches the list); a list edit will add a version (Feature 5). There is no delete yet — when there is, it must be a
*soft* delete, because match history will pin versions.

**Entry points:** "My decks" on Profile today. Later, the **Your deck**
carousel on the pre-match setup sheet (Feature 1), where the player picks the
deck they're running before a match.

**Requirements:**

- Parse a deck into the structured Riftbound sections.
- Respect third-party site rate limits; don't hammer Piltover Archive /
  Riftmana.
- Parsers belong in `@riftlog/core` (`src/decks/`) as pure functions — no
  platform or network code in core; the app does any fetching and hands raw
  input to the parser.

---

## Feature 5 — Deck versioning & change snapshots

**Status:** planned. The storage is ready: deck lists already live in
immutable versions, with the deck pointing at its current one.

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

**Status:** sectioned decklists built (text only, Feature 4); card art
deferred — blocked on a Riot API key (not yet obtained).

**What it is.** Viewing a decklist shows the actual card arts, broken into the
standard Riftbound sections: chosen Champion, Legend, 40-card main deck,
12 Runes, 3 Battlefields, sideboard.

**Dependencies & notes:**

- Requires a production API key from developer.riotgames.com for card data /
  imagery.
- Sections are modelled (Data model note 2) and render structurally today.
- **Adding art must not migrate deck data.** A future card catalog keyed by
  printing code supplies art; lists that have a code use it, text imports
  (no code) match by card name. In the app, every card renders through one
  component, so art arrives in one place.
- Any use of Riftbound imagery carries the fan-made disclaimer (see Riot
  policy in `CLAUDE.md`).

---

## Feature 7 — Profile

**Status:** data model, first-login onboarding (handle claim), and a read-only
profile screen are built. Handle rename UI, profile stats, and owned decks are
the next slices.

**What it is.** A profile screen with the player's display name and `@handle`.
From here the player imports decks and reviews their decklists. The profile is
where a player's owned decks live, distinct from the per-match snapshots.

**Identity.** `profiles.id` (= the auth user id) is immutable and is the
**only** thing other records may reference for identity — future match
opponents, friends, teams. Handle text is never copied onto another record; the
current handle is rendered via a join, so a rename can't leave stale copies.

**Two names, not one — they do different jobs:**

- **`username`** — the unique `@handle` in *Riftlog's* namespace. Lowercase
  `[a-z0-9_]{3,20}`, unique, **claimed by the user at onboarding**. Signup
  seeds a neutral `player_<hex>` placeholder that is never derived from a name
  or email (an email local-part is often a real name the user didn't choose to
  publish); provider names are only offered as *suggestions* at onboarding.
  Some words are reserved (`admin`, `riftlog`, `riot`, …). Renameable **once
  per 30 days**; the onboarding claim doesn't count toward that limit. The
  handle can only change through a server-side check (format, reserved,
  availability, rate limit) — never a plain write.
- **`display_name`** — cosmetic and **not** unique, 1–32 characters. Seeded
  from the provider name; the user confirms or edits it at onboarding. Two
  players called "Maurice" is fine; two `@maurice` is not.

**No profile pictures.** Every account renders the same generic default avatar
(a silhouette in a circle). No avatar is stored, uploaded, or read from the
identity provider.

**Built:** the `profiles` table (owner-only access; handle changes via RPC
only), the seeding trigger, onboarding (Feature 11), and a read-only profile
screen (avatar, display name, `@handle`, sign out). **Not built:** the handle
rename UI (the server side already supports it), profile stats. A bare
"My decks" list sits under the header (Feature 4); its final placement is
still to be decided.

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

## Feature 11 — Accounts, guest mode & tab gating

**Status:** built. Replaces anonymous sign-in, which is gone.

**What it is.** Riftlog requires an account to save anything, but not to try
anything. Those are two separate decisions and the app treats them that way.

**Guest mode (Home only).** A signed-out player can run a full match from Home:
setup sheet, live board, timed mode, Bo3, the lot. It is **in-memory only** —
no Postgres write, no in-progress mirror, no offline outbox entry. Closing the
app loses it. Home shows a persistent, low-key banner the whole time
("Playing as guest — games aren't saved. Sign in to keep your match history.")
which taps through to login. The notice is shown *while they play*, not sprung
on them at the end: a wall that appears the moment something is lost reads as a
bait and switch, and by then the match is already gone.

**The guest match is DISCARDED on login.** Not uploaded, not merged, not
resumed. This is the load-bearing decision of the whole feature: it is what
makes "one data path" true rather than aspirational. Any migration story —
even a trivial one — means merge logic, conflict rules, and a second way for
data to reach the database, forever.

**Tab gating.** Every tab stays visible in the tab bar in every auth state.
Home is guest-usable; **History and Profile are account-gated**. Gated tabs
render their real content blurred and inert under a login card ("You need to
log in to use this feature!" + "No account yet? Sign up!"). It is an in-place
overlay, not a redirect: a guest who taps History should see a
history-shaped screen behind a lock, because that is what makes an account
worth making. A redirect shows them nothing and tells them less.

**Sign-in and sign-up are the same action.** Every "Sign up" link routes to the
same login screen. An unknown email or a first-time OAuth identity creates the
account (and its profile) on the spot. There is no separate registration flow
and no password anywhere in the product.

**Methods:** Discord (primary), Google, Apple, and passwordless email — a
6-digit code, not a magic link. The last method used is remembered on the
device and badged next time, so returning users don't have to remember which
one their account is under. That badge is device-local only.

**Two mechanisms, deliberately.** Discord *and Google* both run the browser
redirect: `signInWithOAuth` → system auth session → tokens off the deep link.
They share one code path that takes the provider as an argument, and one
allow-listed redirect URI. Neither needs an SDK, a client id in the app, or a
config plugin — Supabase holds the credentials. Apple is the exception: iOS
offers no browser flow for it, so it uses the native id-token path via
`expo-apple-authentication`.

Sign in with Apple was briefly removed and then **restored**: App Store
Guideline 4.8 requires it once an app offers other third-party sign-in, so
shipping without it is not an option.

**Identity linking** is Supabase's automatic email matching; there is no manual
linking UI. **Known accepted limitation:** Apple's "Hide My Email" gives a
per-app relay address that will never match the user's real Discord or Google
address, so someone who signs in with Apple *and* Discord can end up with two
separate accounts holding two separate histories. We are not solving this. A
rename/merge flow would be a large feature to serve a small case, and the
alternative (blocking relay addresses) is worse for the user than the problem.

Apple also returns the user's name *only* on the first authorization and never
inside the identity token, so we back it up to user metadata on that one pass.
The profile row is already seeded by then, so Apple users typically get a
`display_name` from the fallback chain (email local part → `'Player'`). That is
accepted, not a bug — they confirm or change it at onboarding.

**Onboarding (first login).** A signed-in account whose onboarding isn't
complete sees one required screen before anything else: a preview of the
default avatar, a **display name** (prefilled from the seeded value), and an
**@handle** field. The handle is prefilled from the provider name (Discord
username, Google/Apple name) when that slug is free; if it's taken, it shows as
unavailable with two or three free variants to tap. Email users, and Apple
users who didn't share a name, start with an empty field and a hint.
Availability is checked live as they type (checking / available / taken /
reserved / invalid, with the rule). "Continue" claims the handle, saves the
name, and marks onboarding complete in one step.

This replaces the earlier "no profile step after login" decision: a handle
other players will use to find you is worth choosing once, on purpose. It is
**resumable** — nothing about it is stored on the device, so a user who kills
the app mid-flow lands back on it — and onboarded users never see it again.
Sign out is available from it, so nobody is trapped. It does **not** gate the
offline tracker: if the profile can't be read (offline launch), the app opens
normally and onboarding applies once the connection returns. An optional deck
import step will follow the required one once deck import (Feature 4) exists.

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
3. **Auth + cloud persistence** — `matches`/`games` tables with RLS; completed
   matches save to the cloud, with an offline outbox that flushes on reconnect.
   Pulled forward because history depends on it. (Feature 3.)
4. **Match history** — list + detail reading from the cloud. (Feature 2.)
5. **Accounts + guest mode** — real sign-in (Discord / Google / Apple / email
   OTP) replacing anonymous auth, guest-mode Home, gated tabs, and the
   `profiles` table. (Feature 11 + Feature 7's data model.) _(Done.)_
6. **Profile identity + onboarding** — claimed handles, reserved names, rename
   rate limit, first-login onboarding, default avatar. (Features 7 + 11.)
   _(Done.)_ Next: handle rename UI, stats; owned decks live here.
7. **Deck import** — plain-text import, sectioned deck view, "My decks".
   (Feature 4.) _(Text import done.)_ Next: Piltover deck-code decoding,
   attaching decks to matches.
8. **Deck versioning & diffs** — version on edit, show change snapshots.
   (Feature 5.)
9. **Card art decklists** — once the Riot API key lands. (Feature 6.)
10. **Match mode (QR)** — v2. (Feature 8.)
11. **Turn tracking** — exploratory. (Feature 10.)
12. **Friends** — exploratory. (Feature 9.)

## Constraints

- **Riot policy is binding** (full text in `CLAUDE.md`). Product implications:
  no cross-user metagame aggregation; a user's own stats only; free tier if
  any monetization exists; paid content must be transformative; fan-made
  disclaimer wherever Riftbound assets/trademarks appear.
- **Cloud-backed history.** Postgres is the single source of truth. The live
  tracker works offline; a match recorded offline is queued in a small local
  outbox and uploaded automatically on reconnect. History itself is never
  mirrored locally — it's read from the cloud on demand.
- **Accessibility.** Result states (win/loss/draw) never rely on color alone —
  always a W/L/D letter badge plus a colored left bar.
- **Motion.** Animations use React Native Reanimated (details in the mobile
  `CLAUDE.md`).

## Open questions

- **Timed mode at zero** — answered for now: nothing auto-ends. The clock runs
  into overtime (counting up in red, labelled OT) and the players still end the
  game themselves, matching the no-auto-end rule for scoring. Still open:
  whether overtime should prompt anything (e.g. suggest ending the round on
  current standings) and whether presets should be editable / custom.
- **Track turns** — timed mode shipped first and the two are independent
  toggles. Whether turn tracking is still wanted alongside it is open
  (Feature 10).
- **Clock placement on the board** — the clock currently sits in the left slot
  of the center bar, rotated a quarter turn so neither player reads it upside
  down. Deliberately a first pass; the board may want a larger or two-sided
  treatment.
- **Scan QR "SOON" teaser** — should the disabled Scan QR affordance ship in v1
  as a teaser for the v2 match-mode feature, or stay out entirely until v2?
- **`Player.xp`** exists in the model but has no defined product meaning.
  Decide what it represents (a gamification/progression idea?) or remove it.
- **Draws** — answered for the match flow: any game can be declared a draw, a
  drawn game settles the series for the player who's ahead, and a series level
  at the format cap is recorded as a match draw (full rule in Feature 1, step
  6). Surfacing is built — `D` badge in the `draw` tokens on the between-games
  screen, the overview, and history rows. Still open: whether an untimed Bo1
  should offer Draw at all, and whether a match draw needs its own overview
  treatment rather than reusing the win/loss layout.
- **Match mode mechanism** — transfer vs. co-record vs. host/join (Feature 8).
- **Deck ownership vs. snapshots** — confirm the relationship between a
  player's editable owned decks and the immutable per-match snapshots in the
  profile UI.
