# Supabase

Database, auth, and Edge Functions for Riftlog.

**Status:** not yet implemented. Directory structure is in place but no
migrations, functions, or config exist yet. It is now **near-term**: cloud
persistence is pulled forward (right after the match-lifecycle slice) because
it is the app's only persistence layer.

Supabase is Riftlog's **sole** persistence layer — there is no local /
on-device store. A match played while signed-out or offline is **not saved**
in v1. The live tracker works offline; only saving requires an account and
connection.

Parent conventions in `../CLAUDE.md` apply. Product detail and sequencing live
in `../SPEC.md`.

## Planned structure

supabase/
├── functions/ Edge Functions (Deno runtime)
│ └── <function-name>/index.ts
├── migrations/ SQL migrations (timestamped files)
└── config.toml Supabase CLI config (when initialized)

## When implementing

- **Use the Supabase CLI** for everything. Don't manually create projects or
  schemas in the dashboard — they won't be in version control.
- **Region: Frankfurt (eu-central-1).** Closest to the user's primary
  audience (Germany), GDPR-aligned.
- **All tables get RLS.** Default-deny, then add explicit policies per use case.

## Tables (planned, not yet created)

- `profiles` — one row per authenticated user
- `matches` — full match records (the `Match` type from `@riftlog/core`)
- `decks` — saved deck definitions (the `DeckSnapshot` type)
- `deck_versions` — historical snapshots for diffing

## Migrations

Once initialized:

- Created via `supabase migration new <name>`
- Append-only — never edit a committed migration
- Run locally: `supabase db reset`
- Push to remote: `supabase db push`

## Edge Functions

When created:

- Deno runtime, not Node. Different module resolution, different stdlib.
- Import shared code from `@riftlog/core` via the workspace (configuration
  TBD when the first function lands).
- Validate inputs with Zod schemas from `@riftlog/core`.
- Use Supabase client with the service role only for trusted server-side
  operations; user-scoped operations should use the user's JWT.

## Sensitive data

- Never commit `.env`, `.env.local`, or any file containing keys
- The Supabase service role key, in particular, must never be in client code
- Use Supabase secrets for environment variables in Edge Functions

## Riot Games policy (binding)

See parent `CLAUDE.md`. Specifically for backend:

- No aggregated win rate / play rate / matchup queries that surface across
  users. A user's own match data is fine; cross-user aggregation is not.
- Deck imports from third-party sites (Piltover Archive, Riftmana) must
  respect rate limits and not abuse those services.

## What's not built

Essentially everything. When implementing, start with:

1. `supabase init` to set up local dev
2. Auth (email + magic link)
3. `profiles` table with RLS
4. Initial `matches` schema matching the `Match` type
5. RLS policies on matches
6. First Edge Function (deck import is the natural first one)

Build incrementally. Verify each step before moving on.
