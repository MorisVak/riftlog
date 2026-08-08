# Supabase

Database, auth, and Edge Functions for Riftlog. Postgres is the **single source
of truth** for match data.

**Status:** the project is linked; `matches` + `games` (with
`time_limit_seconds`) and `profiles` are migrated with RLS; the mobile client,
the online write/read path, and the offline outbox are all built. Auth is
account-only — **anonymous sign-in has been removed** (see Auth below).

Parent conventions in `../CLAUDE.md` apply. Product detail and sequencing live
in `../SPEC.md`.

## CLI invocation

The Supabase CLI is a standalone binary, not an npm dep. Always invoke it via
**`pnpm dlx supabase …`**. Don't add it to `package.json` dependencies.

- **Use the CLI for everything.** Don't create schemas in the dashboard by hand
  — they won't be in version control.
- The project already exists remotely (ref `ruuxthqzkfzmakiywwec`, **region
  `eu-north-1` / Stockholm**). It was linked with
  `pnpm dlx supabase link --project-ref ruuxthqzkfzmakiywwec`, which created the
  local `config.toml`. Don't run `supabase init` again or re-link to a different
  ref. A project's region can't be changed after creation.
- **All tables get RLS.** Default-deny, then explicit per-operation policies.

## Structure

supabase/
├── functions/        Edge Functions (Deno runtime) — none scaffolded yet
│   ├── .env.example  documents the reserved SUPABASE_ prefix (see below)
│   └── .gitkeep
├── migrations/       SQL migrations (timestamped, append-only)
│   ├── 20260628215604_matches_games.sql
│   ├── 20260807143000_matches_time_limit.sql
│   └── 20260808123409_profiles.sql
└── config.toml       Supabase CLI config (linked, anon auth OFF)

## Schema

Three tables. Two mirror the `@riftlog/core` domain terms (a **match** is the
Bo1/Bo3 series, a **game** is one game within it); the third is the account's
profile:

- **`matches`** — `id` (uuid PK = client `Match.id`), `user_id`
  (`default auth.uid()`, FK → `auth.users`), `best_of` (smallint, 1|3),
  `winner_id` (text `'p1'`/`'p2'`, null = draw), `players` (jsonb, mirrors the
  `Player[]` shape), `started_at`, `ended_at` (not null — a row only exists for a
  settled match), `time_limit_seconds` (integer, **null = untimed** — the
  configured clock for the whole match; see below), `host_user_id` /
  `guest_user_ids` (forward-compat, unused in v1), `created_at`.
- **`games`** — `id` (uuid PK = client `Game.id`), `match_id`
  (FK → `matches.id` `on delete cascade`), `user_id` (**denormalized**,
  `default auth.uid()` — so RLS is a direct column check, no join), `game_index`,
  `scores_at_end` (jsonb), `winner_id` (text, **nullable**), `started_at`,
  `ended_at` (**nullable**), `created_at`.

- **`profiles`** — `id` (uuid PK **and** FK → `auth.users` `on delete cascade`
  — a profile can't exist without its user and dies with it), `username`
  (text + a `lower(username)` UNIQUE INDEX, plus a
  `^[a-z0-9_]{2,30}$` check), `display_name`, `avatar_url` (nullable),
  `created_at`, `updated_at`.

  **`username` vs `display_name` are not redundant.** `username` is the unique
  `@handle` in *our* namespace, auto-assigned at signup; `display_name` is the
  cosmetic name the provider gave us and is deliberately not unique. Don't
  collapse them.

  Case-insensitive uniqueness uses a `lower()` unique index rather than
  `citext`: no extension to install, and no `extensions.`-qualification
  friction inside a `search_path = ''` function.

`winner_id`/`ended_at` on `games` are nullable because an early
`concludeMatch()` settles the series without freezing the in-progress game — a
settled match can carry a game with no winner / end time.

**Timed mode stores the limit only.** `matches.time_limit_seconds` is the
configured clock; how long the match actually took comes from
`ended_at - started_at`, and "went into overtime" is that duration compared
against the limit. Don't add elapsed / expired / paused columns — the clock is
derived from wall-clock on the client (`apps/mobile/lib/clock.ts`) and never
pauses, not even between games in a Bo3.

**The DB never re-derives Bo3 / draw logic.** The device settles every match in
`@riftlog/mobile`'s `matchContext` (`settleMatch` / `endGame` / `concludeMatch`);
the schema only persists outcomes already settled. IDs are client-generated
UUIDs, so writes are upserts by primary key.

## Row Level Security

RLS is enabled on all three tables.

`matches` / `games` each have four owner-scoped policies
(`select` / `insert` / `update` / `delete`) for the `authenticated` role,
gated on `user_id = auth.uid()` (inserts/updates also `with check`). `user_id`
is defaulted from the caller's JWT, so the client never sends it.

`profiles` has only **two** policies — `select` and `update`, both
`id = auth.uid()`. The omissions are deliberate: rows are created solely by the
`security definer` seeding trigger and removed solely by the cascade from
`auth.users`, so the client can neither mint nor drop a profile. Don't "fix"
this by adding an insert policy.

## Auth

**Account only. Anonymous sign-in is OFF** (`enable_anonymous_sign_ins = false`)
and was removed on purpose — see `../SPEC.md` Feature 11. A signed-out user gets
an in-memory guest sandbox in the app that writes nothing here, and that match is
discarded on login rather than migrated. Don't reintroduce anonymous auth: it
would recreate the second data path (anon-owned rows needing conversion/merge)
that removing it eliminated.

Providers: Discord (browser redirect), Google and Apple (native id-token), and
passwordless email OTP. Automatic email-based identity linking is left at the
Supabase default; `enable_manual_linking` stays `false`.

> Manual steps — `config.toml` only configures the LOCAL stack. On the **remote**
> project (dashboard → Authentication): disable Anonymous sign-ins; configure the
> Discord, Google, and Apple providers; add the redirect URLs; and edit the email
> template so it contains **`{{ .Token }}`** — at the default
> `{{ .ConfirmationURL }}` Supabase sends a magic link and the app's 6-digit code
> screen has nothing to accept.

### Profile seeding trigger

`public.handle_new_user()` — `security definer`, `search_path = ''`, fired
`after insert on auth.users` — writes the `profiles` row.

- **It's a trigger, not client code, on purpose.** Seeding from the client
  races the OAuth redirect and silently misses every user who bounces mid-flow.
- `display_name` is probed across provider metadata keys (Discord `global_name`,
  Google `full_name`/`name`, …) → email local part → `'Player'`. **Never assume
  Apple returns a name** — it sends one only on the very first authorization,
  and not at all if the user declines.
- `username` is slugified from that seed and made unique by **retrying the
  INSERT on `unique_violation`** (`maurice` → `maurice1` → … →
  `player_<6 hex>`). It deliberately does *not* pre-check availability with a
  SELECT: that is racy under concurrent signups, and the unique index is the
  only thing that can actually arbitrate.
- The function ends with `exception when others then raise warning …; return
  new;`. **A raising trigger aborts the signup**, and no metadata edge case is
  worth locking someone out of creating an account. Failure mode is a user with
  no profile row plus a log line — the client treats a missing profile as a
  real, survivable state.

## Type generation

The generated `Database` type lives at
`packages/core/src/db/database.types.ts` (pure types, no runtime — so it's fine
in `@riftlog/core`) and is re-exported from `@riftlog/core`. Regenerate after
any schema change:

    pnpm db:types   # = supabase gen types typescript --linked, with a DO-NOT-EDIT header

Never hand-edit the generated file. `gen types --linked` reads the remote schema
over the access token (no DB password needed); applying migrations does.

## Migrations

- Created via `pnpm dlx supabase migration new <name>`
- Append-only — **never edit a committed migration**; add a new one
- Push to remote: `pnpm db:push` (= `supabase db push`). The DB password was
  cached in the macOS keychain when the project was linked, so this runs
  non-interactively. It prints a `failed to cache migrations catalog … Docker`
  warning — that's only the local catalog cache; the migration still applies.
- **After every push, run `pnpm db:types`.** The generated `Database` type is
  what the client codes against; skipping it means the new column is invisible
  to TypeScript and the write silently omits it.
- Local `supabase db reset` / `supabase start` need Docker (currently
  unavailable on this machine — schema is applied directly to the remote)

## Edge Functions

No function is scaffolded yet (v1 may not need one). The directory and
`functions/.env.example` exist so the contract is documented. When a function
lands:

- Deno runtime, not Node. Different module resolution, different stdlib.
- Import shared code from `@riftlog/core` via the workspace (configuration
  TBD when the first function lands).
- Validate inputs with Zod schemas from `@riftlog/core` (Zod not added yet).
- Use the Supabase client with the secret key only for trusted server-side
  operations; user-scoped operations should use the user's JWT.
- **`functions/.env` (gitignored) is for LOCAL dev secrets only.** Do **not**
  set `SUPABASE_`-prefixed vars there — that prefix is reserved and
  auto-injected into the function runtime. See `functions/.env.example`.

## Sensitive data

- Never commit `.env`, `.env.local`, or any file containing keys. Both
  `supabase/.env` and `supabase/functions/.env` are gitignored; only the
  `.env.example` files are tracked.
- Keys are the **new format**: `sb_publishable_…` (safe in the client — see the
  mobile env contract) and `sb_secret_…` (**server / CLI only, never bundled**).
  `supabase/.env` holds the `sb_secret_` key for local CLI use.
- Use Supabase secrets for environment variables in Edge Functions.

## Riot Games policy (binding)

See parent `CLAUDE.md`. Specifically for backend:

- No aggregated win rate / play rate / matchup queries that surface across
  users. A user's own match data is fine; cross-user aggregation is not.
- Deck imports from third-party sites (Piltover Archive, Riftmana) must
  respect rate limits and not abuse those services.

## What's not built yet

Done: link + `config.toml`, `matches` / `games` / `profiles` schema + RLS, the
profile seeding trigger, account auth, generated types, and the mobile client's
write/read path + offline outbox. Still ahead (later slices / features):

- Remote provider configuration (manual dashboard steps, see Auth above)
- A client write path for `profiles` (rename the handle) — the `update` policy
  exists, nothing uses it yet
- `decks` / `deck_versions` tables (the `DeckSnapshot` type) for deck import
- First Edge Function (deck import is the natural first one)

Build incrementally. Verify each step before moving on.
