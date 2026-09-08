# Riftlog

A companion app for the Riftbound TCG (Riot Games). Tracks scores, match
history, deck imports.

This repo is a pnpm monorepo. Mobile app at `apps/mobile`, shared types and
parsers at `packages/core`, future Edge Functions and database migrations at
`supabase/`.

The full product spec and build order live in `SPEC.md`. `CLAUDE.md` files
describe _how_ the project works; `SPEC.md` describes _what_ is being built.

## Stack

- **Package manager:** pnpm 10. **Never run npm or yarn in this repo.**
  Use `pnpm add`, `pnpm --filter <package>`, `pnpm exec`. For one-offs,
  `pnpm dlx` (not `npx`).
- **Node 22.** Pinned via `.nvmrc`.
- **TypeScript strict.** No `any` unless explicitly justified. The base
  config in `tsconfig.base.json` enforces strict mode, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, etc. Don't relax these.
- **Mobile:** Expo SDK 54, Expo Router, NativeWind v4, React 19. Animations
  via React Native Reanimated 4 (see `apps/mobile/CLAUDE.md`).
- **Shared:** `@riftlog/core` package — pure TypeScript, no platform code.
- **Backend:** Supabase (account auth + Postgres; Edge Functions not yet
  used). Postgres is the **single source of truth** for match data. See
  "Persistence architecture" below.

## Persistence architecture

Offline-tolerant cloud persistence. **Postgres is the single source of truth**;
the device keeps only (a) the in-progress match and (b) a small outbox of
completed-but-unsynced matches that flushes on reconnect. Match **history is
never mirrored locally** — it's read from Postgres on demand. Local footprint
stays bounded and self-clearing.

Build status: schema + RLS + generated types (`supabase/`), the write/read path,
the offline outbox, and account auth + `profiles` are all built.

- **Domain → tables:** `matches` = the Bo1/Bo3 series, `games` = the games
  within it, `profiles` = one row per account. The DB **never** re-derives
  Bo3 / draw logic — `@riftlog/core` / the mobile `matchContext` settle every
  match, and the DB persists only the settled outcome.
- **Auth: a real account, or nothing is saved.** Sign-in is Discord / Google /
  Apple / email OTP; rows are owned via `auth.uid()` and enforced by RLS.
  **Discord and Google share one browser-redirect handler** parameterised by
  provider — no SDK, no client id in the app, no config plugin. **Apple is the
  one native flow** (id-token), because iOS gives it no browser path. Apple is
  also required by App Store Guideline 4.8 once other third-party sign-in is
  offered, so it is not optional.
  **There is no anonymous sign-in** — it was removed deliberately. A signed-out
  user gets an in-memory guest sandbox on Home that writes to nothing, and that
  match is *discarded* on login rather than migrated. That is what keeps this a
  single data path with zero merge logic; don't reintroduce a second one.

**Key boundary (publishable vs. secret) — non-negotiable:**

- `sb_publishable_…` (publishable key) is safe in the client. It's gated by RLS
  and is the **only** key the mobile app ever uses (via `EXPO_PUBLIC_*` env).
- `sb_secret_…` (secret key) **bypasses RLS** and must never appear in client
  code or any `EXPO_PUBLIC_*` var. Server / CLI only (`supabase/.env`).

## Working in this monorepo

- For mobile work: `cd apps/mobile` and work from there.
- For shared types/parsers: `cd packages/core`.
- Cross-package work: from repo root.
- Workspace-aware install: `pnpm --filter @riftlog/mobile add <pkg>`.
- Native modules: `pnpm --filter @riftlog/mobile exec expo install <pkg>`
  (not `pnpm add` — expo install pins versions compatible with the SDK).

## Package naming

Workspace packages are scoped as `@riftlog/*`:

- `@riftlog/mobile` — Expo app
- `@riftlog/core` — shared types, schemas, parsers
- `@riftlog/web` — Next.js app (planned, not yet created)

Internal imports use the scoped name: `import { Match } from '@riftlog/core'`.

## Git workflow

- One focused commit per feature/refactor. Conventional Commits style:
  `feat(mobile): ...`, `refactor(core): ...`, `chore: ...`, `fix(mobile): ...`.
- Always commit `pnpm-lock.yaml` when it changes.
- Don't commit `node_modules`, `.expo/`, `ios/`, `android/`, build artifacts.
  These are in `.gitignore`.

## Identifiers and tokens

- **iOS bundle identifier:** `com.m-mecke.riftlog`
- **Android package:** `com.m-mecke.riftlog`
- **Expo project:** `@m_mecke/riftlog` (ID stored in `apps/mobile/app.json`)
- **Apple Team:** Maurice Mecke individual account

These are committed. Don't reconfigure EAS, don't run `eas init`, don't change
identifiers without a deliberate reason.

## Riot Games policy (binding)

This app uses Riftbound assets and references the game. Riot has a Riftbound
digital tools policy that we must comply with:

- Free tier required if any monetization exists
- No publishing or retaining metagame-defining data (aggregate win rates per
  deck/card across users, matchup percentages, play rates)
- A user seeing their _own_ stats is fine; cross-user aggregation is not
- Any paid content must be transformative (our work, not Riot's assets)
- API key must be obtained from developer.riotgames.com for production use
- Must include disclaimer: "Riftlog is a fan-made application and is not
  affiliated with, endorsed by, or sponsored by Riot Games. All Riftbound
  imagery and trademarks are property of Riot Games."

Source: https://developer.riotgames.com/docs/riftbound

When in doubt about whether a feature complies, ask the user.

## Riftbound game terminology

For features and UI, use the game's actual terms:

- Match = a Bo1 or Bo3 sequence of games
- Game = a single game within a match, played to a target score
- Target score = 8 by default
- Aspirant's Climb = a Battlefield card that adds +1 to the target score
  per copy in play
- Legend, Champion, Rune, Battlefield, Signature Spell = card types
- Domains = card color identities (Fury, Chaos, Mind, Body, Order, Calm)

Don't invent terminology that doesn't exist in Riftbound.

## What's intentionally not built yet

- Profile editing — renaming the `@handle`, avatar upload, profile stats, owned
  decks. The `profiles` table, its seeding trigger, and a **read-only** profile
  screen are built; nothing writes to that table from the client yet.
- Manual account-linking UI. Supabase's automatic email linking is on and left
  alone; Apple "Hide My Email" relay addresses can't match and may produce a
  second account (accepted, see `SPEC.md`).
- Onboarding flow — deliberately deferred until the app is more polished.
- Deck selection and track-turns in pre-match setup — the setup sheet itself
  is built (Bo1/Bo3, player names, timed toggle + round length)
- Deck imports (Piltover Archive parser first, then Riftmana)
- Match history view — a minimal read-only list is wired to Postgres; the
  designed history UI / detail view is still to come
- v2 QR co-recording feature (data model has placeholder fields)

See `SPEC.md` for the full feature detail and build order. When extending the
app, check whether something is intentionally deferred before building it.
