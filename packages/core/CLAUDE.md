# @riftlog/core

Shared TypeScript domain model, schemas, and pure utilities used by all
Riftlog clients.

Parent conventions in `../../CLAUDE.md` apply.

## What belongs here

- TypeScript types for the domain (`Match`, `Game`, `Player`, `Profile`,
  `CardRef`, `DeckList`, `DeckSnapshot`, future `Card`, etc.)
- Zod schemas for those types (when added)
- Pure functions that operate on domain types (`parseDeckText`,
  `sectionTotals`, handle rules; later `diffDecks`, a deck-code decoder)
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
    ├── index.ts              re-exports the public API
    ├── handles.ts            @handle format rule, slugify, variants, suggestion source
    ├── decks/
    │   ├── parseText.ts      parseDeckText → { list, diagnostics }
    │   ├── formatText.ts     formatDeckText (inverse of the parser)
    │   ├── sections.ts       DeckSection, DECK_TARGETS, sectionTotals, emptyDeckList
    │   ├── domains.ts        DOMAINS, domainFromRuneName, deckDomains
    │   ├── deckCode.ts       looksLikeDeckCode (detection only, no decoding)
    │   ├── validate.ts       isDeckList (runtime guard for stored lists)
    │   ├── *.test.ts         Vitest
    │   └── __fixtures__/     kennen.txt (text export), kennen.code.txt (Piltover code)
    ├── types/
    │   ├── match.ts          Player, PlayerId, Game, Match
    │   ├── deck.ts           CardRef, DeckList, DeckImportSource, DeckSnapshot
    │   └── profile.ts        Profile
    └── db/database.types.ts  generated Supabase types (never hand-edit)

When adding:

- Types → `src/types/<thing>.ts`, re-export from `src/index.ts`
- Deck parsers / decoders → `src/decks/` (the Piltover deck-code decoder goes
  here, tested against `__fixtures__/kennen.code.txt`, which is the same deck
  as `kennen.txt`)
- Schemas → `src/schemas/<thing>.ts` (folder doesn't exist yet; create when needed)

## The deck model

A Riftbound decklist is a `DeckList`, by section: `legend`, `champion`,
`main`, `battlefields`, `runes`, `sideboard`, `additionalLegends`.

- **`main` excludes the chosen-champion copy**, matching the text export: a
  legal list is 39 in `main` + 1 `champion` = the 40-card main deck. Anything
  that counts or shows the main deck adds the champion back — use
  `sectionTotals`, never re-derive 40/12/3.
- **Size checks are warnings, never errors**, and the **sideboard is never
  checked** (SPEC says 8; Piltover Archive shows decks with 10).
- `CardRef.code` is null for text imports; later it holds the full printing
  code including the variant suffix (e.g. `SFD-149a`).
- `additionalLegends` isn't in the game yet. It exists so an import with extra
  legend lines loses nothing; UIs hide it while empty.
- Parser diagnostics carry a 1-based `line` (null for deck-level checks) and a
  `section`, so a UI can show each one where it belongs. Errors mean a line
  was dropped; warnings mean it was kept as written.

## Testing

Vitest, in this package only: `pnpm core test` (or `pnpm test` from the root,
which runs every package's `test` script). Test files sit next to the code as
`*.test.ts`. Fixtures load as text via Vite's `?raw` import
(`import text from './__fixtures__/kennen.txt?raw'`, typed by
`__fixtures__/fixtures.d.ts`), so core needs no `@types/node`. Test files are
type-checked by `pnpm typecheck` like everything else.

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
- `Player.deck` — DeckSnapshot; pins an immutable deck version once decks are
  attached to matches (not built yet)
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

- No Zod schemas (runtime checks so far are hand-written: `isDeckList`)
- No deck-code decoder (Piltover Archive codes are detected, not decoded)
- No Riftmana import, no `diffDecks`, no win-rate utilities

These are on the roadmap. Stubs and placeholders should be avoided — add real
implementations when they're needed.
