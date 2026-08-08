# @riftlog/mobile

Expo SDK 54 app, Expo Router file-based routing, React 19, NativeWind v4
for styling, TypeScript strict.

Parent conventions in `../../CLAUDE.md` (pnpm-only, Riot policy, etc.) apply.

## Project structure

- `app/` — Expo Router routes. Each file is a screen.
  - `_layout.tsx` — root layout: `AuthProvider` > `MatchProvider` > `Stack`
  - `(tabs)/_layout.tsx` — tab navigator (History, Home, Profile)
  - `(tabs)/index.tsx` — Home; also hosts the whole match flow by `phase`
  - `(tabs)/history.tsx` — match history (account-gated)
  - `(tabs)/profile.tsx` — read-only profile + sign out (account-gated)
  - `login.tsx` / `verify-otp.tsx` — modal auth routes
- `components/` — reusable UI components
- `contexts/` — React context providers (`authContext`, `matchContext`)
- `hooks/` — shared hooks that aren't components (`useScreenIntro`)
- `assets/` — icons, splash images

## Styling

NativeWind v4. Tailwind classes via `className`.

- `tailwind.config.js` defines content paths (`./app/**`, `./components/**`)
  and includes the NativeWind preset.
- `global.css` at `app/global.css` has the three Tailwind directives.
- Imported once in `app/_layout.tsx`.
- Don't add `StyleSheet.create(...)` — use NativeWind classes.
- **No inline hex.** Never use arbitrary values like `bg-[#7A1F2B]`. Every
  color comes from a token below. If you need a color that isn't a token,
  add it to `tailwind.config.js` first.

### Design tokens — Archive Periwinkle

The palette lives in `tailwind.config.js`. Token names match the design
system 1:1 so there's no translation step from design to code.

**Base & surface** (darkest → lightest):

- `bg-background` `#0D1B2A` — app background
- `bg-surface` `#18223A` — cards, panels
- `bg-elevated` `#222D47` — raised surfaces (modals, menus)
- `border-border` `#3E506E` — hairlines, dividers

**Accent** — periwinkle, the single brand accent:

- `bg-accent` / `text-accent` `#8B93D9` — primary accent (buttons, active states)
- `accent-strong` `#6D74C4` — pressed / emphasis
- `accent-soft` `#A6ADE6` — lighter accent (e.g. icons on dark)
- `accent-deep` `#14182B` — very dark periwinkle wash (subtle fills)
- Translucent accent fills use opacity, not a token: `bg-accent/15`.

**Text** — under the `ink` family (named `ink`, not `text`, to avoid the
`text-text-*` class collision):

- `text-ink-primary` `#E4E5F2` — primary text
- `text-ink-secondary` `#868FB0` — secondary / labels
- `text-ink-tertiary` `#5E6788` — muted / disabled

**Results** — `win` / `loss` / `draw`, four tokens each:

- `bg-win` `#22C55E` · `text-win-text` `#4ADE80` · `bg-win-tint` `#385041` · `bg-win-deep` `#052E13`
- `bg-loss` `#EF4444` · `text-loss-text` `#FB8181` · `bg-loss-tint` `#573D3D` · `bg-loss-deep` `#2A0606`
- `bg-draw` `#C6A864` · `text-draw-text` `#D8C290` · `bg-draw-tint` `#524D42` · `bg-draw-deep` `#2B2102`

Role of each result token:

- base (`bg-win`) — the colored left bar, badge fill, solid indicator
- `-text` (`text-win-text`) — result text on a dark background
- `-tint` (`bg-win-tint`) — muted row / cell highlight on surface
- `-deep` (`bg-win-deep`) — faint full-bleed background wash

**Scoring actions** — `conquer` (green), `hold` (gold), `special` (pink), each
with a dark `-tint` for the button fill:

How a point was taken, on the play board. A separate family from win/loss/draw
on purpose — those describe a *result*, these describe an *action*, and mixing
them would make either impossible to restyle alone.

**"Active" is always the accent, never a result color.** The game in progress
(the board divider's pip) and a paused clock's control both use `accent` plus
its glow — the same periwinkle the Start-match CTA and the board's END pill
carry. Don't reach for `draw`'s gold or introduce a second highlight color:
result colors mean results.

**Shadows: prefer a plain RN style object over a NativeWind `shadow-*` class on
the play board.** NativeWind parses those classes at render time, and on this
stack (expo-router + NativeWind) that has been implicated in spurious
"Couldn't find a navigation context" errors — the board clock's capsule and the
paused-clock control both threw it until their shadows moved to style objects
(`CLOCK_SHADOW` / `ACCENT_GLOW` in `playField.tsx`, values mirroring the
tokens). The `shadow-accent-*` classes elsewhere are fine as they are; if a new
one starts throwing, this is the first thing to try. See
https://github.com/expo/expo/issues/38423.

**Colorblind-safe rule (non-negotiable):** result color is NEVER the only
signal. Every win/loss/draw indicator pairs the color with (a) a `W`/`L`/`D`
letter badge and (b) a colored left bar. Don't convey result by color alone.

## Animation

Animations use **React Native Reanimated 4** (`react-native-reanimated`
~4.1.7) with `react-native-worklets` (0.5.1). Both already ship as deps with
the Expo template — there is nothing to install.

- **Don't touch `babel.config.js` for Reanimated.** `babel-preset-expo`
  (SDK 54) auto-configures the worklets Babel plugin. Manually adding
  `react-native-worklets/plugin` on top of the preset can double-transform
  worklets and break them.
- Reanimated 4 requires the **New Architecture (Fabric)**, which SDK 54
  enables by default. Don't disable it.
- Reanimated is a **native module**: if animations don't run after you add
  them, clear the Metro cache (`pnpm mobile start --clear`) and rebuild the
  dev client — a JS reload isn't enough.
- Prefer Reanimated over the legacy `Animated` API and over layout hacks.
  Use `useSharedValue` / `useAnimatedStyle` / `withTiming` / `withSpring`
  and `Animated.View`.

### Screen entrance

Every tab shares one entrance: elements fade in while rising ~10px, each
starting `STAGGER_MS` after the last, so the screen assembles top-to-bottom
instead of appearing at once (the design's `.scr` / scrIn). It lives in
`hooks/useScreenIntro.ts` — `useRise` (boxes), `useFade` (hairlines, which read
as sliding if they move), and `playIntro(values)`, where array order is the
stagger order.

Call `playIntro` from the screen's `useFocusEffect` so it **replays on every
focus**, not just mount. Each screen declares its own `useSharedValue(0)` per
element rather than the hook allocating them — the count differs per screen and
allocating in a loop would break the rules of hooks. Don't re-inline the timing
constants into a screen; three divergent copies is what prompted extracting
them.

To re-pin SDK-compatible versions (idempotent, safe to run):

pnpm --filter @riftlog/mobile exec expo install react-native-reanimated react-native-worklets

## Match state

Global state lives in `contexts/matchContext.tsx`. The `MatchProvider` is
mounted at the root in `app/_layout.tsx` so all screens can use `useMatch()`.

The current API:

```typescript
const {
  match, // Match | null
  gameStarted, // derived: match !== null && !match.endedAt
  currentGame, // derived: match.games[match.currentGameIndex]
  phase, // derived: 'idle' | 'playing' | 'between-games' | 'over'
  startMatch, // (config: MatchConfig) => void — format (Bo1/Bo3) + player names from setup
  resumeMatch, // (match: Match) => void — rehydrate an interrupted match on launch (MatchSync)
  endMatch, // () => void — discards the active match (completed-match write already happened)
  endGame, // (result: GameResult) => void — freeze current game, resolve match
  advanceGame, // () => void — start the next game of a Bo3 (after between-games)
  pauseClock, // () => void — stop the timed-match clock (no-op if untimed)
  resumeClock, // () => void — resume it, banking the pause
  incrementScore, // (playerId: 'p1' | 'p2') => void
  decrementScore, // (playerId: 'p1' | 'p2') => void
  setScore, // (playerId: 'p1' | 'p2', value: number) => void
} = useMatch();
```

`GameResult` is `PlayerId | 'draw'` (exported from `matchContext`): the result a
player declares when ending a game. `endGame` freezes the current `Game`
(`scoresAtEnd` / `winnerId` / `endedAt`), increments the winner's `gameWins`,
and resolves the match, setting `Match.winnerId` / `endedAt`. When a Bo3 isn't
yet decided the match sits in the `between-games` phase until `advanceGame`
starts the next game.

A Bo3 settles on any of three conditions — all in `endGame`:

- a player reaches **two game wins**;
- the **third game** is played (the `bestOf` cap; without it, draws would let
  `advanceGame` run into game 4, 5, 6…);
- a game is **drawn while someone leads** — a draw can't be replayed and yields
  no win, so 1–0 followed by a drawn game 2 is a match win for whoever took
  game 1, with no game 3. Level standings (an opening draw, or 1–1) still have
  something to decide, so they play on to the cap and settle as a match draw if
  still level.

A settled Bo3 can therefore have fewer than three games; nothing downstream
(overview, history, persistence) assumes a fixed count — they all map over
`match.games`.

Pre-match setup collects **format (Bo1/Bo3)**, **player names**, and the
**timed-match toggle + round length** via the setup sheet
(`components/matchSetup.tsx`), passed to `startMatch` as a `MatchConfig`; blank
names fall back to "You"/"Opponent". The two slots are **not interchangeable**:
`p1` is always the device owner and `p2` the opponent (see the p1-perspective
rule below). Still deferred (specced in `SPEC.md`, not built): deck selection
and the track-turns control. See the match flow before extending it.

### Timed mode

`Match.timeLimitSeconds` (null = untimed) is the **only** timed-mode state.
There is no ticking value in context, no paused flag, nothing on `Game`:

- One clock covers the whole match and **never pauses** — the between-games
  break in a Bo3 is sideboarding time and runs on the same clock.
- Remaining time is **derived from wall-clock** in `lib/clock.ts`
  (`limit - (now - game 1 startedAt)`), so it can't drift and needs no
  restoring after a background/reload/outbox resume. Don't add a stored
  countdown or a per-second reducer.
- At zero it keeps counting **into overtime** (`+mm:ss`, loss-colored, labelled
  `OT`). Nothing auto-ends — same rule as scoring.
- `components/matchClock.tsx` renders it and returns `null` when untimed, so it
  can be dropped in unconditionally. `variant="board"` sits quarter-turned in
  the play field's center band; `variant="screen"` is the between-games
  interstitial's, rendered twice (once rotated 180°) so both players get an
  upright clock.
- **The clock can be paused**, so it is *not* purely wall-clock derived any
  more: `Match.clockPausedAt` + `clockPausedMs` bank the pauses and
  `runningMs()` subtracts them. Still nothing ticks — a paused clock is a
  steady derived value, and `MatchClock` stops its own timer while paused.
  Pause state is not persisted to Postgres, so a completed match's "played"
  time in history includes any paused time.
- **Rotating text needs an explicitly sized wrapper.** A transform is paint
  only — it doesn't change layout — so a rotated clock dropped into a narrow
  slot lays out at that slot's width and truncates (`50:00` → `2…`). The board
  clock sits in a wrapper with an explicit pre-rotation width (`CLOCK_W`), and
  the clock text also carries `adjustsFontSizeToFit` so it scales rather than
  ellipsizes if a box is ever too small.

### Board layout

The two halves are separated by a **line, not a bar** — no format label, no
game counter, nothing taking board space from either player:

- `components/boardDivider.tsx` draws the line. For a Bo3 the series cells sit
  *inline* with it (line → cells → line) with **no gaps**, so the run reads as
  one connected honeycomb chain rather than dots on a rule. Cells are hexagons
  built from plain Views — a body rectangle plus a border-trick triangle at each
  end, with a smaller fill hexagon centered over an outline one to fake a
  stroke. There's no polygon primitive in RN and `react-native-svg` isn't a
  dependency; adding it would force a dev-client rebuild for one shape.
- Cell states: the game being played is `accent` filled with an `accent-soft`
  outline and a slow glow (2.2s breath, shadow opacity 0.45→0.95); decided games
  are solid ink; games not yet reached are hollow outlines, so the comb is
  visible from the start and fills in as the round is played.
- The clock and the controls float in an absolutely positioned `box-none`
  strip centered on the divider, so taps still reach the halves everywhere
  except on the buttons.
- Controls are the exit `✕` on the right, and — on a timed match — one
  pause/resume toggle (`Feather` `pause` ↔ `play`) sitting **with the clock**
  on the left, since it's the clock it acts on. Paused shows an accent outline
  + glow and greys the clock; there's deliberately no "PAUSED" label, which
  would grow the rotated capsule. Nothing else belongs here — the pass-turn
  control is still deferred.
- History stores only the configured limit; elapsed time and the
  overtime flag are derived from `started_at`/`ended_at` in `lib/historyView.ts`.
- The setup sheet offers two presets (30 / 60 min) plus **Custom**, which opens
  `components/durationPicker.tsx` — minute/second wheels built from a snapping
  `ScrollView`, not a picker dependency. A timed match at 00:00 can't start; the
  Start button disables and says so.
- Because those wheels scroll vertically, the sheet's **drag-to-dismiss is
  scoped to the grab handle + title**, not the whole sheet. Don't widen it back
  or the pan will swallow the wheel drag.

Conventions:

- **A point is scored by saying HOW.** Under the numeral sit three buttons —
  conquer / hold / special — and **tapping the numeral takes a point back**;
  there is no separate decrement control. All three actions currently just
  `incrementScore` by 1; which one was pressed is **not** recorded yet (that
  needs a field on `Game`), so don't assume history can break points down.
- **Scoring is a manual tally — no auto-end.** Score can't drop below 0;
  there's no upper bound and no win-at-target logic. Games and the match end
  only via explicit user action (with a confirm prompt), so stray or accidental
  taps never close anything.
- **All score actions take a `PlayerId`, never a setter.** The old setter-
  passing pattern was removed in the refactor.
- **Player identity within a match is `'p1' | 'p2'`.** This is independent
  of any future Supabase user account (which would be a separate `userId`
  field on `Player`).
- **`p1` is always "you", `p2` always the opponent.** History derives
  win/loss/draw, score order (`you–them`), and the "vs {name}" row label from
  p1's outcome (`lib/historyView.ts`), and the board puts p1 on the near side.
  Don't render a bare player name anywhere in history — label the opponent.
- **Match and Game IDs are UUIDs** generated via `expo-crypto`. Don't use
  incrementing counters.
- **`gameStarted` is derived, not stored.** Don't add a separate flag.
- **`phase` is derived, not stored.** It's computed from `match` /
  `endedAt` / the current game's `endedAt` — don't add a stored phase field.
- **Dates are ISO strings**, not `Date` objects. Easier to serialize for
  Supabase later.

## Adding new score-like actions

Follow the existing pattern in `matchContext.tsx`:

1. Add the action signature to `MatchContextType`.
2. Implement using `updatePlayer(playerId, updater)` for player-scoped changes.
3. Use functional `setMatch((prev) => ...)` to avoid stale closures.
4. Return new objects (immutable update) — don't mutate in place.

## Haptics

`expo-haptics` is installed. Pattern:

```typescript
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // significant
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // win
```

Haptics don't work in the iOS simulator; test on a real device for the feel.

## Native module additions

Don't use `pnpm add <native-module>`. Use:

pnpm --filter @riftlog/mobile exec expo install <package>

Expo's resolver pins versions compatible with SDK 54. Plain `pnpm add` picks
latest, which usually mismatches and causes runtime errors.

To verify alignment with the SDK after installs:

pnpm --filter @riftlog/mobile exec expo install --check

## Development

- Run on simulator: `pnpm mobile start` then press `i`
- Run on phone via Expo Go: `pnpm mobile start --go` then scan QR with iOS Camera
- Clear cache when config changes (Babel/Metro/tailwind): `pnpm mobile start --clear`

## EAS

The project is configured for EAS Build:

- `apps/mobile/eas.json` has development, preview, production profiles
- `expo-dev-client` is installed for the development profile
- Apple credentials provisioned for `com.m-mecke.riftlog`
- One iPhone UDID is registered

Don't run `eas init`, `eas build:configure`, or change identifiers without
deliberate intent. The project on Expo's servers is `@m_mecke/riftlog`.

For simulator dev builds (free, no Apple credentials needed):
`eas build --profile development --platform ios --local`.

## Supabase & persistence

Postgres is the single source of truth for match data. The typed client lives in
`lib/supabase.ts` (**not** in `@riftlog/core`, which stays platform-agnostic):
`createClient<Database>` with the publishable key and an encrypted session store.
Schema, RLS, and types-gen are documented in `../../supabase/CLAUDE.md`.

**Env contract.** Two vars, both `EXPO_PUBLIC_`-prefixed — anything without that
prefix is **not** bundled into the app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_…` key, safe in
  the client and gated by RLS.

`.env` is gitignored; `.env.example` is committed. **Never reference the secret
key (`sb_secret_…`) from the app** — it bypasses RLS and is server/CLI-only.

**Storage adapter.** The auth session is stored via `LargeSecureStore` (Expo
SecureStore holds a per-key AES-256 key; AsyncStorage holds the ciphertext) —
the approach from the official Supabase Expo quickstart. That store holds the
**session only**. Offline match data uses plain AsyncStorage (see Offline
outbox) — we deliberately do **not** add a second storage library.

**Auth.** See the "Auth & guest mode" section below — it's load-bearing enough
to have its own.

**Write path.** There is no "match completed" callback — completion is
`match.endedAt` flipping non-null inside the matchContext reducers. `MatchSync`
(`components/matchSync.tsx`, mounted under `MatchProvider`) watches `match` and:

- mirrors the in-progress match to local storage on every change;
- on completion, calls `syncCompletedMatch()` (`lib/sync.ts`) — try Postgres,
  fall back to the outbox — then clears the in-progress slot;
- on launch, rehydrates an interrupted in-progress match (`resumeMatch`) and
  flushes the outbox.

`saveCompletedMatch()` (`lib/matchPersistence.ts`) upserts the match + its games
by client UUID. The DB never re-derives Bo3 / draw logic — it persists only what
the context settled.

**Offline outbox.** `lib/localStore.ts` is the bounded local store: exactly two
AsyncStorage keys — the single in-progress match and an outbox array of
completed-but-unsynced matches. `flushOutbox()` (`lib/sync.ts`, single-flight)
drains the outbox on reconnect (NetInfo), on app foreground (AppState), and after
any successful write; confirmed uploads are removed so the outbox trends empty
online. Both items self-clear. **Don't add a third local key or mirror history
locally** — keep the footprint to these two items.

**Read path.** History reads come straight from Postgres on demand
(`fetchMatchHistory()`), scoped to the caller by RLS — never mirrored locally.

**History rows** (`lib/historyView.ts` → `components/historyRow.tsx`). The
view-model is the single place row display is decided; keep the components dumb.
Rules that are easy to get wrong:

- **Never render a bare player name.** `p1` is you, so the row labels the other
  side — `vs {opponent}` — and the expanded detail names both in score order
  (`you – opponent`).
- **Absent is not zero.** Rows written before a column existed read back as
  `undefined`, so optional fields use loose `== null` checks. A strict `=== null`
  on `time_limit_seconds` is what once rendered a `NaN:NaN` clock on every row.
- **The clock chip is for timed matches only.** `vm.timer` is `null` for an
  untimed match and the icon + limit are inside that guard — an untimed row
  shows just `BO1`/`BO3`.
- **Legacy placeholder names are normalized.** Matches started with blank name
  fields stored the literal `"Player 1"` / `"Player 2"`; those render as
  `You` / `Opponent` rather than being shown as if they were real names.
- **Home's preview row mirrors the History row.** Both render the same
  `HistoryRowVM` and share `components/matchMeta.tsx` for the format + clock
  line, so they can't drift. Home's copy just drops the swipe-delete and the
  expandable detail.
- **Tapping a Home row deep-links into History.** It navigates with a `matchId`
  param; History expands that row, resets the filter to `All` so a chip can't
  hide it, then clears the param (so re-focusing the tab doesn't re-expand, and
  tapping the same match again still works).

## Auth & guest mode

`contexts/authContext.tsx` is the only place session state lives. It exposes
`session` / `user` / `status` / `signOut`, and is mounted **above**
`MatchProvider` in `app/_layout.tsx` so `MatchSync` can read both.

- **`status` is `'loading' | 'authed' | 'guest'`, derived, never stored** —
  same rule as `phase`. `'loading'` is a real third state, not a synonym for
  guest: treating it as guest flashes the login gate over every account tab on
  every cold start.
- **There is no anonymous sign-in.** It was removed. A signed-out user gets a
  guest sandbox; see the write rules below.
- The `AppState` → `startAutoRefresh`/`stopAutoRefresh` pair is registered at
  module scope (process-wide, not per-mount).

### Guest mode — the write rules (don't soften these)

`components/matchSync.tsx` enforces them. A guest's match is **in-memory only**:
no Postgres row, no in-progress mirror, no outbox entry. On sign-in the guest
match is **discarded** (`endMatch()`), never uploaded or merged.

Two traps live here, both already handled — don't undo them:

1. **`guestMatchIds`.** Sign-in flips `status` and re-runs the write effect in
   the *same commit*, while the discard is a `setState` that hasn't landed yet.
   Gating writes on the current status alone therefore uploads the guest's
   match into the account that just signed in. Matches seen while signed out
   are tracked **by id** and stay untouchable regardless of later auth state.
2. **`clearOutbox()` on sign-out** (`lib/localStore.ts`, called from
   `signOut()`). Outbox entries carry **no `user_id`** — `matches.user_id`
   defaults from `auth.uid()` at insert time — so a match queued by account A
   and flushed while account B is signed in is written to **B**. The queue is
   only ever valid for the session that filled it.

### Gating

`components/authGate.tsx` wraps History and Profile. Signed out it renders the
tab's real content inert (`pointerEvents="none"`) under a `BlurView` and a login
card. **In-place overlay, never a redirect** — and both gated screens skip their
own fetch while signed out, or they'd paint an RLS error behind the blur. Home is
guest-usable and shows `components/guestBanner.tsx` throughout.

`BlurView` takes a **style object, not a className** — NativeWind doesn't map
classes onto third-party native components without `cssInterop`.

### Providers

`lib/auth.ts`, one function per method, each recording `setLastAuthMethod` on
success. Cancellation returns `'cancelled'` rather than throwing, so a dismissed
sheet doesn't paint a red error.

- **Discord** — browser flow: `signInWithOAuth({ skipBrowserRedirect: true })` →
  `WebBrowser.openAuthSessionAsync` → `getQueryParams` → `setSession`. Tokens
  come back in the URL **fragment**, which `Linking.parse` can't read — hence
  `expo-auth-session/build/QueryParams`.

**The redirect URI is a hard-coded constant, `AUTH_REDIRECT_URI`
(`riftlog://auth-callback`) — do not "improve" it back into `makeRedirectUri()`.**
Called with no arguments, `makeRedirectUri()` only yields a bare `riftlog://`
when expo-linking considers the app Expo-hosted; otherwise it bakes the Metro
host in (`riftlog://192.168.0.34:8081`), so the value moves with the dev
machine's network and can't be allow-listed. One fixed value, allow-listed once,
identical in dev and production.

**Failure mode to know, because it is silent.** If that URI isn't in Supabase →
Authentication → URL Configuration → Redirect URLs, Supabase does **not** return
an error — it redirects to **Site URL** instead. The browser lands on a page that
isn't there, no deep link ever fires, and from the app's side that is
indistinguishable from the user cancelling. Hence the `__DEV__` warning on the
non-success branch in `signInWithDiscord`: if a sign-in "cancels" itself, read
the Metro logs. Site URL is set to the same app URL so a future misconfiguration
at least bounces back into Riftlog.
- **Google / Apple** — native `signInWithIdToken`. For Google the **web** client
  id is the token audience Supabase verifies, not the iOS/Android one; the iOS
  and Android client ids must additionally be listed in the Supabase provider's
  *Authorized Client IDs*.
- **Email** — `signInWithOtp({ shouldCreateUser: true })` → 6-digit
  `verifyOtp`. `shouldCreateUser` is what makes sign-in and sign-up one action.
  **No passwords anywhere in this app.**

**These two are native modules, so OAuth does not work in Expo Go** — `pnpm
mobile start --go` is no longer enough for auth work; use a dev client.
`app.json`'s `iosUrlScheme` is a placeholder until the real reversed iOS client
id is filled in by hand.

`lib/authPrefs.ts` holds the "Last used" badge — device-local, non-sensitive,
readable while signed out, and deliberately **not** in `lib/localStore.ts` so
that file's "exactly two match keys" contract stays true.

## What not to build proactively

The user is building incrementally. Don't add the following until its slice
is explicitly started:

- Deck selection and the track-turns control in pre-match setup (format,
  player names, and timed mode are built; the rest is deferred)
- Deck import/parsing
- The designed history UI / detail view (only a minimal read-only list exists)
- Profile **editing** — renaming the handle, avatar upload, stats. The profile
  screen is read-only by design; the data model and seeding are done.
- An onboarding flow, and any manual account-linking UI

Match **history is never mirrored locally** — read from Postgres on demand — so
don't build a growing on-device history store. Local persistence is bounded to:
the encrypted auth **session** (LargeSecureStore), the **offline match state**
(in-progress match + outbox, `lib/localStore.ts`), and the one non-sensitive
"last used sign-in method" key (`lib/authPrefs.ts`). Don't add more.

Also: don't add local persistence for **guest** matches. It looks like a
kindness and it isn't — anything durable a guest produces has to be either
migrated at login (merge logic, which this design exists to avoid) or thrown
away later anyway, more confusingly.

These are specced in `SPEC.md` and sequenced — build them when their roadmap
step begins, not ahead of it.

## Design handoffs

Screens come from Claude Design as web structure (HTML/CSS). Always

implement them in React Native (View/Text/NativeWind) against the

existing components and tokens — never paste web markup, never introduce

inline hex. Map every design color to a token in tailwind.config.js; if a

needed color has no token, add one rather than hardcoding it.
