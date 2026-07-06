# @riftlog/mobile

Expo SDK 54 app, Expo Router file-based routing, React 19, NativeWind v4
for styling, TypeScript strict.

Parent conventions in `../../CLAUDE.md` (pnpm-only, Riot policy, etc.) apply.

## Project structure

- `app/` — Expo Router routes. Each file is a screen.
  - `_layout.tsx` — root layout, wraps everything in `MatchProvider`
  - `(tabs)/_layout.tsx` — tab navigator (History, Main, Settings)
  - `(tabs)/index.tsx` — main screen (score tracker entry)
  - `(tabs)/history.tsx` — placeholder
  - `(tabs)/settings.tsx` — placeholder
- `components/` — reusable UI components
- `contexts/` — React context providers (currently just `matchContext`)
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
- `border-border` `#2E3C56` — hairlines, dividers

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
  incrementScore, // (playerId: 'p1' | 'p2') => void
  decrementScore, // (playerId: 'p1' | 'p2') => void
  setScore, // (playerId: 'p1' | 'p2', value: number) => void
} = useMatch();
```

`GameResult` is `PlayerId | 'draw'` (exported from `matchContext`): the result a
player declares when ending a game. `endGame` freezes the current `Game`
(`scoresAtEnd` / `winnerId` / `endedAt`), increments the winner's `gameWins`,
and resolves the match (Bo1 after one game; Bo3 at two game wins, setting
`Match.winnerId` / `endedAt`). When a Bo3 isn't yet decided the match sits in
the `between-games` phase until `advanceGame` starts the next game.

Pre-match setup collects **format (Bo1/Bo3)** and **player names** via the
setup sheet (`components/matchSetup.tsx`), passed to `startMatch` as a
`MatchConfig`; blank names fall back to "Player 1"/"Player 2". Still deferred
(specced in `SPEC.md`, not built): timed mode, deck selection, and the
track-turns control. See the match flow before extending it.

Conventions:

- **Scoring is a manual tally — no auto-end.** Score can't drop below 0;
  there's no upper bound and no win-at-target logic. Games and the match end
  only via explicit user action (with a confirm prompt), so stray or accidental
  taps never close anything.
- **All score actions take a `PlayerId`, never a setter.** The old setter-
  passing pattern was removed in the refactor.
- **Player identity within a match is `'p1' | 'p2'`.** This is independent
  of any future Supabase user account (which would be a separate `userId`
  field on `Player`).
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

**Auth.** Anonymous sign-in on first launch (`app/_layout.tsx`) gives every
device an `auth.uid()` to own its rows; `persistSession` restores it afterward.
Requires anonymous sign-ins enabled on the remote project.

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

## What not to build proactively

The user is building incrementally. Don't add the following until its slice
is explicitly started:

- Timed-mode toggle, deck selection, and track-turns control in pre-match
  setup (format + player names are built; the rest is deferred)
- Timed-game mode (clock + data-model fields)
- Deck import/parsing
- The designed history UI / detail view (only a minimal read-only list exists)

Match **history is never mirrored locally** — read from Postgres on demand — so
don't build a growing on-device history store. Local persistence is bounded to
exactly two things: the encrypted auth **session** (LargeSecureStore) and the
**offline match state** (in-progress match + outbox, in AsyncStorage via
`lib/localStore.ts`). Don't add more local storage than that.

These are specced in `SPEC.md` and sequenced — build them when their roadmap
step begins, not ahead of it.

## Design handoffs

Screens come from Claude Design as web structure (HTML/CSS). Always

implement them in React Native (View/Text/NativeWind) against the

existing components and tokens — never paste web markup, never introduce

inline hex. Map every design color to a token in tailwind.config.js; if a

needed color has no token, add one rather than hardcoding it.
