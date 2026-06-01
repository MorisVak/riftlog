# Riftlog

A companion app for the Riftbound TCG (Riot Games). Tracks scores, match
history, deck imports.

This repo is a pnpm monorepo. Mobile app at `apps/mobile`, shared types and
parsers at `packages/core`, future Edge Functions and database migrations at
`supabase/`.

## Stack

- **Package manager:** pnpm 10. **Never run npm or yarn in this repo.**
  Use `pnpm add`, `pnpm --filter <package>`, `pnpm exec`. For one-offs,
  `pnpm dlx` (not `npx`).
- **Node 22.** Pinned via `.nvmrc`.
- **TypeScript strict.** No `any` unless explicitly justified. The base
  config in `tsconfig.base.json` enforces strict mode, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, etc. Don't relax these.
- **Mobile:** Expo SDK 54, Expo Router, NativeWind v4, React 19.
- **Shared:** `@riftlog/core` package — pure TypeScript, no platform code.
- **Backend:** Supabase (auth + Postgres + Edge Functions). Not yet
  implemented. Forward-compatible fields exist in the data model.

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

- Auth (planned: Supabase auth with magic links)
- Persistence (state is in-memory; AsyncStorage or Supabase coming)
- Pre-match setup UI (Bo1/Bo3 toggle, target score, deck selection)
- Between-games UI for Bo3
- Claim-victory flow
- Deck imports (Piltover Archive parser first, then Riftmana)
- Match history view (data model exists, no UI yet)
- v2 QR co-recording feature (data model has placeholder fields)

When extending the app, check whether something is intentionally deferred
before building it.
