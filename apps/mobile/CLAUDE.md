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

Color usage so far:

- `bg-darkerBackground` — main app background (custom, defined in tailwind config — TODO if not yet defined)
- `bg-[#7A1F2B]` / `text-[#F5D6D6]` / `active:bg-[#5C1620]` — destructive action (END button)

When introducing semantic colors, prefer adding tokens to
`tailwind.config.js` over inline arbitrary values. Use semantic names
(`danger`, `success`, `primary`) not literal color names (`red`, `green`).

## Match state

Global state lives in `contexts/matchContext.tsx`. The `MatchProvider` is
mounted at the root in `app/_layout.tsx` so all screens can use `useMatch()`.

The current API:

```typescript
const {
  match, // Match | null
  gameStarted, // derived: match !== null && !match.endedAt
  currentGame, // derived: match.games[match.currentGameIndex]
  startMatch, // () => void — uses defaults (Bo1, target 8)
  endMatch, // () => void — discards match (no persistence yet)
  incrementScore, // (playerId: 'p1' | 'p2') => void
  decrementScore, // (playerId: 'p1' | 'p2') => void
  setScore, // (playerId: 'p1' | 'p2', value: number) => void
} = useMatch();
```

Conventions:

- **All score actions take a `PlayerId`, never a setter.** The old setter-
  passing pattern was removed in the refactor.
- **Player identity within a match is `'p1' | 'p2'`.** This is independent
  of any future Supabase user account (which would be a separate `userId`
  field on `Player`).
- **Match and Game IDs are UUIDs** generated via `expo-crypto`. Don't use
  incrementing counters.
- **`gameStarted` is derived, not stored.** Don't add a separate flag.
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

## What not to build proactively

The user is building incrementally. Don't add:

- Pre-match config screens
- Victory detection / claim-victory UI
- AsyncStorage persistence
- Real Supabase integration
- Auth screens
- Deck import/parsing

These have data model placeholders but are deferred until the user opts in.
