# @riftlog/core

Shared TypeScript domain model, schemas, and pure utilities used by all
Riftlog clients.

Parent conventions in `../../CLAUDE.md` apply.

## What belongs here

- TypeScript types for the domain (`Match`, `Game`, `Player`, `DeckSnapshot`,
  future `Card`, `Deck`, etc.)
- Zod schemas for those types (when added)
- Pure functions that operate on domain types (`calculateWinRate`,
  `diffDecks`, `parsePiltoverDeck`)
- Constants (Riftbound formats, deck-building rules)

## What does NOT belong here

- React components or JSX
- React Native imports
- Anything platform-specific (no `expo-*`, no `react-*` outside type imports)
- I/O — no fetch, no Supabase client, no file system access
- UI types (button props, component props) — those stay in the consuming app

The package is consumed by:

- `@riftlog/mobile` (Expo / React Native, via Metro)
- `@riftlog/web` (Next.js, planned)
- Supabase Edge Functions (Deno runtime, planned)

So nothing here can assume a specific runtime. Pure TS only.

## Current structure

src/
├── index.ts re-exports the public API
└── types/
├── match.ts Player, PlayerId, Game, Match
└── deck.ts DeckSnapshot

When adding:

- Types → `src/types/<thing>.ts`, re-export from `src/index.ts`
- Schemas → `src/schemas/<thing>.ts` (folder doesn't exist yet; create when needed)
- Parsers → `src/parsers/<source>.ts` (e.g., `piltover.ts`, `riftmana.ts`)

## Conventions

- **Dates as ISO 8601 strings**, not `Date` objects. Easier to serialize.
- **IDs as strings** (typically UUIDs for entities). PlayerId is a literal
  union (`'p1' | 'p2'`) because it represents a slot within a match, not a
  globally-unique entity.
- **No default exports** for types. Use named exports only.
- **No barrel re-exports from subfolders.** Re-export at `src/index.ts`
  explicitly for visibility.

## Forward-compatible fields

Several types include fields with no current consumer:

- `Player.userId` — Supabase user ID once auth lands
- `Player.deck` — DeckSnapshot, used when deck import ships
- `Match.hostUserId` / `guestUserIds` — for v2 QR co-recording
- `Match.notes` / `tags` — for match history features

These are intentional. Don't remove them or treat them as dead code.

## Why no build step

The package's `package.json` has `"main": "./src/index.ts"` — consumers
import TypeScript directly. Metro and Next.js both compile TS natively.

Don't add a build step (no `tsc -b`, no `tsup`, no bundling) unless the
package is being published to npm. Internal monorepo consumption doesn't
need one.

## What the package does not do yet

- No runtime validation (Zod schemas planned)
- No parsers (Piltover Archive, Riftmana coming)
- No pure-function utilities (deck diffing, win rate calc, etc.)

These are all on the roadmap. Stubs and placeholders should be avoided —
add real implementations when they're needed.
