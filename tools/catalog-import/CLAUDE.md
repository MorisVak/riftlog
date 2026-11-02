# @riftlog/catalog-import

Seeds and syncs the Supabase card catalog from Riftcodex
(https://api.riftcodex.com). Server-side only: it uses the **secret key**.
Parent conventions in `../../CLAUDE.md` apply (see its "Card catalog"
section); the schema is in `../../supabase/CLAUDE.md`.

## Running it

From the repo root:

    pnpm catalog:import                            # dry run: fetch, compare, report
    pnpm catalog:import --apply                    # write the reported changes
    pnpm catalog:import --from-snapshot <file>     # use a saved snapshot, no network
    pnpm catalog:import --report <file.json>       # also save the full plan

Paths are relative to where you run the command. The script is invoked with
`pnpm --filter … run import` because `import` is also a pnpm command.

**Always dry-run first** and read the report: what would be inserted /
updated (with the changed columns), rows skipped as manually edited,
conflicts with rows we didn't import, entries Riftcodex has that couldn't be
mapped (the `SFD-T03` token is the one expected), overrides that matched
nothing, suspicious names, rows gone from Riftcodex, and the safety checks.
Every run prints the current catalog version.

## Key handling

`src/env.ts` reads only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from
`supabase/.env` (gitignored). It refuses a key that doesn't start with
`sb_secret_` and never prints it. Nothing in `apps/` may reference that key.

## Snapshots

Every successful live fetch saves the raw Riftcodex responses with the fetch
time to `.cache/riftcodex-<timestamp>.json` (gitignored). `--from-snapshot`
runs the same pipeline from one, so an import doesn't depend on Riftcodex
being up. A later live sync writes only what changed, because the plan
compares with the database.

## How it works

- `src/riftcodex.ts` — fetch (pauses between requests, 30 s timeout per
  request, retries) and shape checks; an unexpected response stops the run.
- `src/transform.ts` — pure: drops spoiler-era twins, applies
  `overrides.json`, maps each entry to a printing code (`SET-NNN[variant]`;
  promos also name their parent set, `OPP-SFD-086`), derives `overnumbered`
  for printings numbered above their set size, takes card text from the rich
  field (line breaks kept), and groups printings into cards by
  `normalizeCardName`. A card's fields come from its base printing
  (`pickBasePrinting` in `@riftlog/core`, the same rule the app uses).
  Status: a set with no or a future release date is `spoiler`.
- `src/plan.ts` — pure: desired rows vs. the database → inserts / updates
  (only rows that really differ), skips, conflicts, rows gone, safety stops.
- `src/apply.ts` — reads the catalog (paged) and writes a plan in order:
  overrides, sets, cards, printings. Not one transaction, but idempotent: re-run
  after a failure.
- `src/cli.ts` — the command line above.

The pure modules use no Node APIs, so they can move into an Edge Function.

## overrides.json

Corrections to Riftcodex data, keyed by Riftcodex's own `id` (its
`riftbound_id` isn't unique). Fields: `code`, `name`, `type`, `supertype`,
`domains`, `text`, `image_url`, `orientation`, `status`, `overnumbered`,
`skip`. Each entry has a `note` saying why. Today: the 16 Metal promo codes
(`m`), the Kennen legend's name (two printings) and Jayce's VEN-194 (name and
overnumbered).

## Tests

`pnpm --filter @riftlog/catalog-import test` — Vitest on a small real sample
(`src/__fixtures__/riftcodex-sample.json`): mapping, overrides, base printing,
promo parents, rich text, plan rules, snapshots.
