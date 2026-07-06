-- matches + games: persistence for completed Riftlog matches.
--
-- The device settles every match in @riftlog/mobile's matchContext (settleMatch
-- / endGame / concludeMatch). This schema NEVER re-derives Bo3 / draw logic — it
-- only persists outcomes the client has already settled. IDs are client-generated
-- UUIDs (Match.id / Game.id), so writes are upserts by primary key.
--
-- A match = a Bo1/Bo3 series; a game = one game within it (games.match_id -> matches.id).

-- ============================================================================
-- matches  (the series)
-- ============================================================================
create table public.matches (
  -- = client Match.id. No default: the device generates it (expo-crypto UUID).
  id uuid primary key,
  -- RLS owner. Defaulted from the caller's JWT on insert; see policies below.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  best_of smallint not null check (best_of in (1, 3)),
  -- 'p1' / 'p2', or null for a draw. The client has already settled this.
  winner_id text check (winner_id in ('p1', 'p2')),
  -- Player array (name / gameWins / xp / userId per player), mirrors the
  -- @riftlog/core Player shape 1:1 — fixed at 2 players for v1.
  players jsonb not null,
  started_at timestamptz not null,
  -- A row only exists for a settled match, and settleMatch always stamps this.
  ended_at timestamptz not null,
  -- Forward-compatible (v2 QR co-recording). Unused in v1.
  host_user_id uuid references auth.users (id) on delete set null,
  guest_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- History reads are "this user's matches, newest first".
create index matches_user_id_ended_at_idx on public.matches (user_id, ended_at desc);

-- ============================================================================
-- games  (one game within a match)
-- ============================================================================
create table public.games (
  -- = client Game.id.
  id uuid primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  -- Denormalized owner so RLS is a direct column check, no join to matches.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_index smallint not null check (game_index >= 0),
  -- { p1, p2 } final scores, mirrors Game.scoresAtEnd.
  scores_at_end jsonb not null,
  -- Nullable: an early concludeMatch() settles the series WITHOUT freezing the
  -- in-progress game, so a settled match can carry a game that has no winner /
  -- end time. A non-null value is 'p1' / 'p2'.
  winner_id text check (winner_id in ('p1', 'p2')),
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index games_match_id_idx on public.games (match_id);

-- ============================================================================
-- Row Level Security: a user reads/writes only their own rows.
-- user_id is defaulted from auth.uid() on insert and pinned by WITH CHECK.
-- ============================================================================
alter table public.matches enable row level security;
alter table public.games enable row level security;

create policy "matches: owner can select" on public.matches
  for select to authenticated using (user_id = auth.uid());
create policy "matches: owner can insert" on public.matches
  for insert to authenticated with check (user_id = auth.uid());
create policy "matches: owner can update" on public.matches
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "matches: owner can delete" on public.matches
  for delete to authenticated using (user_id = auth.uid());

create policy "games: owner can select" on public.games
  for select to authenticated using (user_id = auth.uid());
create policy "games: owner can insert" on public.games
  for insert to authenticated with check (user_id = auth.uid());
create policy "games: owner can update" on public.games
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "games: owner can delete" on public.games
  for delete to authenticated using (user_id = auth.uid());
