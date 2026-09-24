# Supabase

Database, auth, and Edge Functions for Riftlog. Postgres is the **single source
of truth** for match data.

**Status:** the project is linked; `matches` + `games` (with
`time_limit_seconds`), `profiles` (claimed handles + onboarding),
`reserved_names`, and `decks` + `deck_versions` are migrated with RLS; the mobile client,
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
│   ├── 20260808123409_profiles.sql
│   ├── 20260924151001_profile_identity.sql
│   ├── 20260924151509_drop_profile_avatar.sql
│   └── 20260924155255_decks.sql
└── config.toml       Supabase CLI config (linked, anon auth OFF)

## Schema

Match, profile, and deck tables plus one lookup table. `matches` / `games`
mirror the `@riftlog/core` domain terms (a **match** is the Bo1/Bo3 series, a
**game** is one game within it); `profiles` is the account; `decks` /
`deck_versions` are the player's saved decks:

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
  (text, `^[a-z0-9_]{3,20}$` check + a `lower(username)` UNIQUE INDEX),
  `display_name` (text, trimmed, 1–32 chars, check), `username_changed_at`
  (null until the first post-onboarding rename), `onboarded_at` (**null = needs
  onboarding**), `created_at`, `updated_at`. **No avatar column** — there are
  no profile pictures of any kind; `avatar_url` was dropped on purpose.

  **`profiles.id` is the only identity reference.** Other tables (future match
  opponents, friends, teams) reference `profiles.id`, never the handle text —
  handles are renameable, so render the current one via a join.

  **`username` vs `display_name` are not redundant.** `username` is the unique
  `@handle` in *our* namespace, claimed by the user at onboarding;
  `display_name` is cosmetic and deliberately not unique. Don't collapse them.

  Case-insensitive uniqueness uses a `lower()` unique index rather than
  `citext`: no extension to install, and no `extensions.`-qualification
  friction inside a `search_path = ''` function.

- **`reserved_names`** — `name` (text PK, lowercase). Words no handle may take
  (`admin`, `riftlog`, `riot`, `me`, …). RLS on, **no policies, no client
  grants**: clients learn a name is reserved only through
  `is_username_available`. It's a table rather than a list in a function so a
  future teams namespace can share it via `is_name_reserved(text)`, and adding
  a word is a data insert.

- **`decks`** — `id` (uuid PK), `owner_id` (`default auth.uid()`, FK →
  `auth.users` `on delete cascade`), `name` (trimmed, 1–60), `import_source`
  (`'text' | 'piltover_code' | 'manual'`), `source_code` (nullable; only
  allowed on `piltover_code` imports), `current_version_id`, `created_at`,
  `updated_at` (trigger).
- **`deck_versions`** — `id` (uuid PK), `deck_id`, `owner_id` (denormalized,
  like `games.user_id`), `list` (jsonb = the core `DeckList`; shape-checked by
  `is_deck_list()`, ≤ 64 KB), `created_at`. **Immutable** — no update or delete
  for any client, ever.

  Two composite FKs keep them honest: a version's `(deck_id, owner_id)` must
  match its deck, and a deck's `(id, current_version_id)` must name one of
  *its own* versions.

  **Versions are what everything pins.** Match history, per-deck stats, and a
  match-mode opponent's view will reference `deck_versions.id`, so an edit is
  a *new* version plus moving `current_version_id` (Feature 5), never an
  update in place. For the same reason there is no deck delete yet, and when
  there is it must be a **soft delete** (`archived_at`) — a hard delete would
  cascade away versions that history points at.

  Designed for, not built: attaching versions to matches (`Player.deck` in the
  `players` jsonb, or a `match_decks` table), `profiles.favorite_deck_id`, and
  an extra `select` policy on `deck_versions` letting an opponent read the one
  version used in a shared match. **Card catalog (future):** a `cards` table
  keyed by the full printing code (`SFD-149a`) with name / type / domains /
  art, filled server-side once the Riot API key exists. Lists keep
  `CardRef.code`; text imports (code null) resolve art by normalized name at
  read time, so no stored list ever needs migrating.

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

RLS is enabled on every table.

`matches` / `games` each have four owner-scoped policies
(`select` / `insert` / `update` / `delete`) for the `authenticated` role,
gated on `user_id = auth.uid()` (inserts/updates also `with check`). `user_id`
is defaulted from the caller's JWT, so the client never sends it.

`profiles` has only **two** policies — `select` and `update`, both
`id = auth.uid()`. The omissions are deliberate: rows are created solely by the
`security definer` seeding trigger (or `complete_onboarding`'s repair path) and
removed solely by the cascade from `auth.users`, so the client can neither mint
nor drop a profile. Don't "fix" this by adding an insert policy.

**RLS picks the row; column grants pick the columns.** `authenticated` holds
`UPDATE (display_name)` and nothing else on `profiles` (insert / delete /
truncate revoked from `anon` and `authenticated`). Without that, the owner
update policy would let a client rewrite its own `username` — skipping format,
reserved, and rate-limit checks — or stamp `onboarded_at`. **Don't re-grant
table-wide UPDATE.**

### Profile RPCs

All `security definer`, `search_path = ''`, executable by `authenticated`
only (revoked from `anon` and `public`), and they **reject anonymous JWTs**
(`is_anonymous`), which still carry the `authenticated` role. Each returns a
text status code rather than raising, so the client maps codes to copy:

- **`is_username_available(text)`** → `available | invalid_format | reserved |
  taken`. Read-only, for the live UI check. Your own current handle counts as
  available. Advisory only — the unique index is the guarantee.
- **`claim_username(text)`** → `ok | invalid_format | reserved | taken |
  rate_limited | no_profile`. Renames. Before onboarding: no rate limit and
  `username_changed_at` isn't stamped (the onboarding claim doesn't count).
  After: once per 30 days. Re-claiming your own handle is a no-op `ok`. Catches
  the `unique_violation` race and returns `taken`.
- **`complete_onboarding(p_username, p_display_name)`** → `ok |
  invalid_display_name | invalid_format | reserved | taken`. One transaction:
  creates the profile row if it's missing, claims the handle (same rules as
  above), sets the trimmed display name, stamps `onboarded_at`. Idempotent — an
  already-onboarded caller gets `ok` and nothing changes. `onboarded_at` has no
  other write path.

Internal helpers (`require_account`, `username_status`, `set_username`,
`seed_display_name`, `insert_seed_profile`, `is_name_reserved`) have EXECUTE
revoked from every client role. They still appear in the generated types —
types-gen reads the schema, not the grants.

**Supabase grants EXECUTE on new `public` functions to `anon` and
`authenticated` explicitly**, not just via `PUBLIC`. Any new function must
`revoke ... from public, anon, authenticated` and grant back only what's meant
to be callable.

### Deck access

Owner-only `select` on both deck tables. Clients hold `SELECT` on both and
`UPDATE (name)` on `decks` — nothing else: no direct inserts (so a deck can
never exist without a version), no deletes, no version writes.

**`create_deck(p_name, p_import_source, p_source_code, p_list)`** → deck id.
`security definer`, `require_account()`, `authenticated` only. Inserts the
deck, its first version, and sets `current_version_id` in one transaction.
Invalid input raises `22023` with `invalid_name` / `invalid_source` /
`invalid_list` as the message (the client validates first, so this is a bug
path). `p_source_code` has no SQL default, so the generated type requires a
string: pass `''` for "none" — the function stores it as null.

The client embeds the current version with
`deck_versions!decks_current_version_fkey(...)`; the FK name is required
because the two tables are related both ways.

## Auth

**Account only. Anonymous sign-in is OFF** (`enable_anonymous_sign_ins = false`)
and was removed on purpose — see `../SPEC.md` Feature 11. A signed-out user gets
an in-memory guest sandbox in the app that writes nothing here, and that match is
discarded on login rather than migrated. Don't reintroduce anonymous auth: it
would recreate the second data path (anon-owned rows needing conversion/merge)
that removing it eliminated.

Providers: Discord and Google (both browser redirect), Apple (native
id-token), and passwordless email OTP. Automatic email-based identity linking is
left at the Supabase default; `enable_manual_linking` stays `false`.

**The provider split decides what you configure here.** Discord and Google run
through Supabase's `/authorize` endpoint, so the dashboard holds their client id
+ secret and the app sends only a provider name — nothing to add under
*Authorized Client IDs*, which is a native-flow field. Apple is the opposite: the
app sends an id-token minted for the **iOS bundle**, so `com.m-mecke.riftlog`
must be listed in the Apple provider's Client IDs or `signInWithIdToken` rejects
it.

> Manual steps — `config.toml` only configures the LOCAL stack. On the **remote**
> project (dashboard → Authentication): disable Anonymous sign-ins; configure the
> Discord, Google, and Apple providers; set the URLs below; and edit the email
> template so it contains **`{{ .Token }}`** — at the default
> `{{ .ConfirmationURL }}` Supabase sends a magic link and the app's 6-digit code
> screen has nothing to accept.

**URL Configuration — exact values.** Both must be `riftlog://auth-callback`,
matching `AUTH_REDIRECT_URI` in `apps/mobile/lib/auth.ts`:

- **Redirect URLs** → add `riftlog://auth-callback`.
- **Site URL** → `riftlog://auth-callback`, *not* the default
  `http://localhost:3000`.

Site URL matters more than it looks: it is the **fallback** Supabase redirects to
when an OAuth `redirect_to` fails allow-list validation. It does not raise an
error, so a missing Redirect URL presents as the browser dead-ending on an
unreachable page while the app waits forever for a callback. Pointing Site URL at
the app turns that into a survivable bounce instead of a dead end.

### Profile seeding trigger

`public.handle_new_user()` — `security definer`, `search_path = ''`, fired
`after insert on auth.users` — writes the `profiles` row.

- **It's a trigger, not client code, on purpose.** Seeding from the client
  races the OAuth redirect and silently misses every user who bounces mid-flow.
- `display_name` is probed across provider metadata keys → email local part →
  `'Player'`, then trimmed and cut to 32 chars (`seed_display_name`). **Never
  assume a provider returns a name** — Apple sends one only on the very first
  authorization and never inside the token, and the email-OTP path supplies
  none at all. The client backfills Apple's name to user metadata after
  sign-in, but that lands *after* this trigger has inserted the row.
- **Observed Discord metadata (Supabase):** `custom_claims.global_name` = the
  display name, `full_name` = the Discord **username**, `name` =
  `username#0`. There is no top-level `global_name`. `avatar_url`/`picture` are
  present and are **not read**. Google and Apple shapes are unconfirmed against
  real rows.
- `username` is **always a neutral `player_<8 hex>`**, never derived from a name
  or the email (an email local part is often a real name). The user claims a
  real handle at onboarding. Collision safety is retrying the INSERT on
  `unique_violation` (`insert_seed_profile`), not a pre-check SELECT, which is
  racy.
- The function ends with `exception when others then raise warning …; return
  new;`. **A raising trigger aborts the signup**, and no metadata edge case is
  worth locking someone out of creating an account. Failure mode is a user with
  no profile row plus a log line — `complete_onboarding` creates the missing
  row, and the client treats a missing profile as "needs onboarding".

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

Done: link + `config.toml`, `matches` / `games` / `profiles` /
`reserved_names` / `decks` / `deck_versions` schema + RLS, the profile seeding
trigger, the profile RPCs (availability, claim, onboarding), `create_deck`,
account auth, generated types, and the mobile client's write/read path +
offline outbox. Still ahead (later slices / features):

- Remote provider configuration (manual dashboard steps, see Auth above)
- The handle rename UI — `claim_username` supports it (30-day limit), no
  client calls it yet
- Deck editing (`add_deck_version`), soft delete, and attaching deck versions
  to matches
- The card catalog (`cards`), once the Riot API key exists
- First Edge Function (none needed so far — text import parses on-device)

Build incrementally. Verify each step before moving on.
