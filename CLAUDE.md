# Riftlog

A companion app for the Riftbound TCG (Riot Games). Tracks scores, match
history, deck imports.

This repo is a pnpm monorepo. Mobile app at `apps/mobile`, the riftlog.net
website at `apps/web`, shared types and parsers at `packages/core`, future Edge
Functions and database migrations at `supabase/`.

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
  Tested with Vitest: `pnpm test` from the root (see `packages/core/CLAUDE.md`).
- **Backend:** Supabase (account auth + Postgres; one Edge Function,
  `revoke-apple`). Postgres is the **single source of truth** for match data. See
  "Persistence architecture" below.

## Persistence architecture

Offline-tolerant cloud persistence. **Postgres is the single source of truth**;
the device keeps only (a) the in-progress match and (b) a small outbox of
completed-but-unsynced matches that flushes on reconnect. Match **history is
never mirrored locally** — it's read from Postgres on demand (kept in
memory for the session only, never on the device; see "Session cache" in
`apps/mobile/CLAUDE.md`). Local footprint
stays bounded and self-clearing. (Separately, the public **card catalog** is
cached as one replaceable file — reference data, not match data; see
`apps/mobile/CLAUDE.md`.)

Build status: schema + RLS + generated types (`supabase/`), one Edge Function
(`revoke-apple`, Sign in with Apple revocation at account deletion), the write/read path,
the offline outbox, account auth + `profiles`, and first-login onboarding
(handle claim) are all built.

- **Domain → tables:** `matches` = the Bo1/Bo3 series, `games` = the games
  within it, `profiles` = one row per account. The DB **never** re-derives
  Bo3 / draw logic — `@riftlog/core` / the mobile `matchContext` settle every
  match, and the DB persists only the settled outcome.
- **Identity:** `profiles.id` (= auth user id) is the only identity reference
  other records may hold. Never store handle text elsewhere — handles are
  renameable; join for the current one. No profile pictures of any kind.
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
- `@riftlog/web` — Next.js marketing site for riftlog.net (waitlist + legal pages)

Internal imports use the scoped name: `import { Match } from '@riftlog/core'`.

## Git workflow

- One focused commit per feature/refactor. Conventional Commits style:
  `feat(mobile): ...`, `refactor(core): ...`, `chore: ...`, `fix(mobile): ...`.
- Always commit `pnpm-lock.yaml` when it changes.
- Don't commit `node_modules`, `.expo/`, `ios/`, `android/`, build artifacts.
  These are in `.gitignore`.

## Identifiers and tokens

- **iOS bundle identifier:** `com.m-mecke.riftlog`
- **Android package:** `com.m-mecke.riftlog` — **open question:**
  `apps/mobile/app.json` currently says `com.mmecke.riftlog`. One of the two
  is wrong; ask the owner before touching either (it's store identity).
- **Expo project:** `@m_mecke/riftlog` (ID stored in `apps/mobile/app.json`)
- **Apple Team:** Maurice Mecke individual account

These are committed. Don't reconfigure EAS, don't run `eas init`, don't change
identifiers without a deliberate reason.

**EAS profiles and card art (store safety).** Card art is behind a build flag
(`EXPO_PUBLIC_CARD_ART`, read in `apps/mobile/lib/featureFlags.ts`): on in
`development`, `preview` and **`testflight`**, off in **`production`**.
TestFlight and the App Store ship the *same* binary, so **only a
`production`-profile build may ever be submitted for App Store review** —
never a `testflight` one. A non-dev build with art on shows a small "Card art
preview" label at the bottom of the profile page, so such a build is
recognizable.

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
- Public web pages also carry Riot's Legal Jibber Jabber statement, verbatim:
  "Riftlog was created under Riot Games' 'Legal Jibber Jabber' policy using
  assets owned by Riot Games. Riot Games does not endorse or sponsor this
  project."
- **In the app, the Legal Jibber Jabber statement appears once, at the bottom
  of the profile page** — together with the fan-made disclaimer above, both
  verbatim, small but visible without tapping anything open ("clear and easy
  to find"), whatever the card art flag says. Not repeated on other screens.

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

## Before launch — urgent

Open items for a public launch, written up at the top of the `SPEC.md`
roadmap; raise them whenever release prep, the App Store, auth or email comes
up:

- **Smoothness — "buttery", the owner's goal (hard todo, was "History
  lags").** Done so far: the inline row expansion and per-row entrance
  animations are gone; History builds its rows up front; card art stays
  decoded in memory (`cachePolicy="memory-disk"`); the history query skips
  each game's recorded points (half the payload); matches and decks are
  kept in memory for the session, shown at once and refreshed quietly, and
  only changed rows redraw. **Next: the owner checks it on TestFlight** (a
  release build on a device) — the simulator runs a dev build, several
  times slower. Then, if still needed: batch the in-progress
  match's storage write (it runs on every score tap; a ~300 ms window
  would be lost if the app is killed), pass known box sizes to `FocusedArt`
  so art doesn't wait a layout pass, and cap History's up-front rows for
  very long histories.
- **In-app account deletion** — built (Profile → Account → Delete account,
  the `delete_my_account` RPC; Apple accounts first revoke their Apple
  tokens via the `revoke-apple` Edge Function). Open: `/privacy` still
  describes deletion by email only (legal pages need the owner's sign-off).
- **Test account deletion end to end (hard todo, owner, with a friend).**
  The `revoke-apple` function is deployed (active; an unauthenticated call
  gets 401), but the full flow has never run. Sign in with Apple on a
  separate account — **Hide My Email**, or a friend's Apple ID, so it can't
  auto-link to the owner's main account — onboard, Profile → Delete account
  → confirm → confirm with Apple. Expect the signed-out Home with "Account
  deleted", the profile / matches / decks gone, and Riftlog gone from
  Settings → Apple Account → Sign in with Apple. Also once with a Discord /
  Google / email account (no Apple step).
- **Website rework (hard todo).** riftlog.net still shows the app as it
  was: new screenshots of the reworked app, short animated recordings
  (GIF / video) of the key moments (game-start intro, scoring and a
  take-back, between games), and the page's motion reworked to match. No
  card art on the website — record with the art flag off or keep art out of
  frame. **Part of it: the privacy notice** — `/privacy` ("Your choices")
  still says accounts are deleted by email within 30 days; add in-app
  deletion (Profile → Delete account, immediate; Apple sign-in revoked), and
  `/terms` points there too. Legal pages need the owner's sign-off. Details
  in `SPEC.md`.
- **"Buy me a coffee" in the app** — built (Profile → Support, opens the
  browser). App Store risk: Apple can treat a tip link as a digital
  purchase outside in-app purchase (Guideline 3.1.1); be ready to hide it
  in the review build if it's flagged.
- **Custom SMTP for sign-in emails** — none configured, so Supabase's
  built-in sender is used, which only reaches members of the Supabase
  organization (~2 emails/hour). Email-code sign-in fails for real users;
  Discord / Google / Apple work.
- **Approved Riot API key before a public release.** A public App Store /
  Google Play release requires an approved Riot API key (or a written
  license), per Riot's Legal Jibber Jabber. The card art flag doesn't change
  that. The production key application is still pending.

## Card catalog

Every Riftbound card and printing lives in our Postgres catalog (`sets`,
`cards`, `card_printings`, …; schema in `supabase/CLAUDE.md`). It's filled
from **Riftcodex** (an open, unofficial card API) by the importer in
`tools/catalog-import`. Sets Riftcodex doesn't carry yet come from **Riot's
official card gallery** (playriftbound.com/en-us/card-gallery, whose page
embeds its card data) with `--source gallery`, written as `source = 'riot'`
— today only Radiance (RAD). The apps only ever read our tables, never
Riftcodex or Riot.

**Card art is self-hosted.** `pnpm catalog:images` copies each printing's
image once from its `image_url` into our `card-images` bucket, in two sizes
(`cards/<CODE>.webp` 744 px, `cards/small/<CODE>.webp` 240 px for list rows;
about 100 KB per printing), and sets `storage_path`. The app loads art from
the bucket; `image_url` is only a fallback. Dry run by default, `--apply` to
copy, `--limit N` for a trial; resumable. The importer never touches
`storage_path`, so re-imports keep the art.

**Adding new cards later** (a new set, spoilers once Riftcodex or the gallery
has them): dry-run the import, `--apply`, then `pnpm catalog:images --apply`,
then `pnpm catalog:legend-focus --sheet <png>` for new legends' backdrop crops
(check the sheet, commit the JSON).

**Importer** (details in `tools/catalog-import/CLAUDE.md`):

- `pnpm catalog:import` — **dry run** (the default): fetches Riftcodex, saves
  the raw responses as a snapshot in `tools/catalog-import/.cache/`
  (gitignored), compares with the database and prints what would change.
  Writes nothing.
- `--apply` writes exactly those changes; `--from-snapshot <file>` runs from a
  saved snapshot instead of the network; `--report <file>` saves the full
  plan as JSON. Always dry-run first and read the report.
- **Key handling:** it reads only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
  from `supabase/.env` (gitignored), refuses anything that isn't an
  `sb_secret_…` key, and never prints it. The secret key is never referenced
  from `apps/mobile` or `apps/web`.
- **What it never does:** overwrite a row with `manually_edited = true` or a
  row it didn't import (`source = 'manual'` / `'riot'` — reported as a
  conflict), delete anything (rows gone from Riftcodex are only listed), or
  apply past a safety stop (two entries mapping to one code, one name with
  two card types, or Riftcodex returning >10% fewer printings than we hold).
- **Corrections to Riftcodex data** (a wrong name, a code, a missing flag) go
  in `tools/catalog-import/overrides.json` — versioned in git, re-applied on
  every run, synced into `catalog_overrides` on `--apply`.
- The catalog version (`catalog_meta.version`) bumps itself on any real
  change; the app refetches only then.

**Adding a spoiler card by hand** (Supabase dashboard → Table Editor, until
there's an admin screen; you need a row in `catalog_admins` only for writes
from the app, not for the dashboard):

1. **Set** — if the set isn't in `sets` yet (e.g. RAD): add `code` (`RAD`),
   `name`, `released_on` (leave empty or a future date while it's
   unreleased), `deck_code_set_id` (from the deck-code library's set map:
   OGN 0, OGS 1, ARC 2, SFD 3, UNL 4, VEN 5, RAD 6; empty for promo sets),
   `source = manual`, `status = spoiler`.
2. **Card** — in `cards`: `name`, `name_key` (the name lowercased, " - "
   written as ", ", curly quotes straight, any trailing "(…)" tag dropped —
   e.g. "Riven - The Exile" → `riven, the exile`; it must match how decks
   spell the card), `type`, `supertype`, `domains`, `energy` / `might` /
   `power`, `current_text` (line breaks as new lines), `source = manual`,
   `status = spoiler`.
3. **Printing** — in `card_printings`: `code` (`RAD-012`, plus `a` / `*` for
   alt art / signed), `card_id` (the card from step 2), `set_code`,
   `collector_number` (`012`), `variant`, the flags, `printed_text`,
   `orientation` (`landscape` for battlefields), `source = manual`,
   `status = spoiler`.
4. **Image** — upload it to the `card-images` storage bucket (e.g.
   `RAD/RAD-012.webp`, max 5 MB, png / jpeg / webp) and put that path in the
   printing's `storage_path`.
5. Nothing to bump: the version moves by itself. Check that
   `catalog_meta.version` went up.

When Riftcodex later carries the card, the importer reports the manual rows
as conflicts and leaves them alone. To hand a card over to the importer, set
its rows' `source` to `riftcodex` and run a dry run: it then updates them in
place (the card id is kept).

**Errata** (by hand, until there's an admin screen): update the card's
`current_text`, set `manually_edited = true` so imports keep your wording,
and add a `card_errata` row (`card_id`, `previous_text`, `new_text`,
`effective_on`, `source_note`). The app doesn't show errata yet.

**Editing any imported row by hand:** set `manually_edited = true` on it, or
the next import puts Riftcodex's value back. Prefer `overrides.json` for
corrections Riftcodex should keep getting.

**TODO — admin entry screen.** Later: an in-app (or web-admin) screen for
catalog admins to add and edit cards and printings, upload images to the
bucket, enter errata, and switch spoiler / released. Saving sets
`source = 'manual'` (new rows) or `manually_edited = true` (edited imported
rows); the version bumps itself. Writes are already admin-only by RLS.

**Card art is mobile-only for now.** Only `apps/mobile` renders card images
(behind the `CARD_ART` flag, see "EAS profiles and card art" above).
`apps/web` — riftlog.net, its screenshots and any future deck pages — must
not show card art: no image components, no remote image domains for
`cmsassets.rgpub.io` or the bucket. Don't retake website screenshots with
card art on.

### Known catalog gaps

- **Radiance (RAD)** comes from Riot's gallery, not Riftcodex (which still
  lacks it as of 2026-11-04): 167 cards, 219 printings, `source = 'riot'`.
  RAD reprints of cards Riftcodex already has (the runes, Aphelios, Ezreal,
  Kayn, Sett, Yone) keep their Riftcodex card row; only the RAD printings
  attach to it. 11 RAD cards (Hush, Fanfare, Scorched Earth, …) have no
  domain in Riot's data. When Riftcodex adds RAD, its sync reports the RAD
  rows as conflicts and leaves them alone; hand them over by setting
  `source = 'riftcodex'` as for manual rows.
- **Gallery spellings can differ from deck exports** ("Hunters' Circle" vs.
  "Hunter's Circle"): name matching ignores apostrophes as a fallback.

### Open items

- **Pending manual test (owner):** saving a code-imported deck.
- **Pending fixture:** a Piltover Archive deck code containing an
  overnumbered printing, to extend the proof test in
  `packages/core/src/catalog/deckFromCode.test.ts`. Promos need none: they
  can't appear in deck codes (OPP / PR / JDG aren't in the library's set map).
- **The "newer format" deck-code message** is only unit-tested, not checked
  on the simulator.

## Website and operations

- **riftlog.net** is `apps/web`, deployed on **Vercel** from `main` (root
  directory `apps/web`). Vercel forwards riftlog.net → **www.riftlog.net**.
  Env vars there are the two `NEXT_PUBLIC_SUPABASE_*` values, saved as type
  **Config** (not Secret — they're public by design; keep the prefix even
  though Vercel warns). `NEXT_PUBLIC_*` is baked in at build: redeploy after
  changing them.
- **Contact address:** `support@riftlog.net`, a Cloudflare Email Routing
  forward to the owner's inbox. Cloudflare only *receives* — it can't send
  (see the SMTP item above).
- **Operator:** Maurice Mecke, a solo developer. Public copy and legal pages
  speak in the first person ("I"), never "we". Legal details live only in
  `apps/web/src/lib/legal.ts`.
- **TODO (Supabase Pro):** once the project moves to Pro, use Supabase
  branching for migrations instead of pushing straight to production, and
  set up a regular backup routine. Until then migrations go straight to the
  live project — dry-run first. Local dumps go in `/backups/` (gitignored);
  never commit or read anything there.
- **Supabase DPA:** incorporated into Supabase's Terms of Service — no
  separate signature. The contracting entity is **Supabase Pte. Ltd.
  (Singapore)**; the project's data is hosted in the EU (Stockholm).
- **Copy style:** short, plain sentences. The owner dislikes awkward or
  "legal-talkish" text. Legal pages follow riftatlas.com's plain style; the
  landing page keeps its full sections (an over-simplified version was
  reverted).

## What's intentionally not built yet

- Profile editing — the `@handle` rename UI, profile stats. The
  `profiles` table, seeding trigger, onboarding (claim handle + display name),
  and a profile screen (read-only identity, plus a default-deck setting) are
  built; the rename RPC exists but no client UI calls it yet. Profile pictures
  are ruled out, not deferred.
- Manual account-linking UI. Supabase's automatic email linking is on and left
  alone; Apple "Hide My Email" relay addresses can't match and may produce a
  second account (accepted, see `SPEC.md`).
- Onboarding beyond the required handle step — the optional deck-import step
  isn't built, even though text import now exists; it goes *after*
  `onboarded_at` is set so it can never block the gate.
- Track-turns in pre-match setup — the setup sheet itself is built (Bo1/Bo3,
  player names, timed toggle + round length, optional deck, the opponent's
  legend — required, under internal testing)
- Deck imports beyond text and deck codes — Riftmana. Plain-text and
  deck-code import (Piltover Archive codes; unknown printings kept in an
  "Unsorted" section), "Copy deck code", editing a deck's list (each save is a new
  immutable version), the sectioned deck view, a Decks tab (with search
  and a recently updated / created sort), and choosing
  your deck for a match are built.
- Match mode extras on the match detail — the opponent's deck, linked profile,
  head-to-head, their win rate (v1 shows your side only)
- v2 QR co-recording feature (data model has placeholder fields)
- The rest of the website roadmap, in order: Sideboard guide, Quick log
  (record a finished match without live scoring), Stats,
  Playerboard customization (legend / custom board backgrounds), Teams &
  friends (add friends, invite to a game, share decks; teams as a clan with
  a shared deck pool — needs match mode first). Details in `SPEC.md`.

See `SPEC.md` for the full feature detail and build order. When extending the
app, check whether something is intentionally deferred before building it.
