@AGENTS.md

# @riftlog/web

Next.js 16 app, App Router, React 19, Tailwind CSS v4, TypeScript strict.
The companion web client for Riftlog (mobile is the primary client today). Right
now this app is a **marketing one-pager** — a static landing/waitlist page. No
product functionality (no auth, no match data) lives here yet.

Parent conventions in `../../CLAUDE.md` (pnpm-only, Riot policy, the
publishable-vs-secret key boundary) apply. `@AGENTS.md` above is
`create-next-app`'s warning that this Next.js major has breaking changes vs.
older training data — check `node_modules/next/dist/docs/` when unsure.

## Project structure

- `src/app/` — App Router routes. `layout.tsx` (root layout + fonts), `page.tsx`
  (the one-pager, composed from section components), `globals.css` (Tailwind
  entry + design tokens).
- `src/components/` — landing-page section components (`SiteHeader`, `Hero`,
  `Features`, `ScreenshotShowcase`, `WaitlistCta`, `SiteFooter`) plus shared
  bits (`Wordmark`, `WaitlistForm`, `PhoneMock`). Mirrors mobile's `components/`.
- `public/` — static assets.
- `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` — tooling config.

## Monorepo integration

- **Package:** `@riftlog/web`. Run from root as `pnpm --filter @riftlog/web <cmd>`
  (`dev` / `build` / `start` / `lint` / `typecheck`), or from `apps/web`.
- **TypeScript:** `tsconfig.json` extends the workspace `../../tsconfig.base.json`
  (strict, `noUncheckedIndexedAccess`, etc.), re-adding only the Next-specific
  options (`jsx`, DOM libs, the `next` plugin, `@/*` alias). Don't relax the base.
- **Shared code:** import domain + generated `Database` types from
  `@riftlog/core` (`import type { Match } from '@riftlog/core'`). It's consumed
  as raw TS source — Next compiles it, no build step. `@riftlog/core` stays
  platform-agnostic: no React, no client, no I/O lives there.
- **Ignore rules** live in the root `.gitignore` (`.next/`, `out/`,
  `next-env.d.ts`) — this app has no nested `.gitignore`, matching `apps/mobile`.

## Styling & design system

Tailwind CSS v4 (PostCSS via `@tailwindcss/postcss`). **The mobile app is the
single source of design truth.** The "Archive Periwinkle" palette from
`apps/mobile/tailwind.config.js` (JS config) is ported **1:1** into the `@theme`
block of `src/app/globals.css` (Tailwind v4 uses CSS-based config). Same token
names, same hex — `bg-background`, `bg-surface`, `border-border`, `bg-accent`
(+ `-strong`/`-soft`/`-deep`), `text-ink-primary`/`-secondary`/`-tertiary`, the
`win`/`loss`/`draw` families, and the `shadow-accent-card`/`shadow-accent-btn`
glows.

Rules (inherited from mobile):
- **No arbitrary hex.** Every color is a token; if you need a new one, add it to
  the `@theme` block first (and keep it in sync with the mobile config).
- **Fonts:** Space Grotesk (display/UI) + IBM Plex Mono (numerals), loaded via
  `next/font/google` in `layout.tsx` as `--font-space-grotesk` /
  `--font-ibm-plex-mono`, exposed as the `font-display` / `font-mono` tokens.
  Unlike mobile (separate per-weight family tokens), web uses the single
  `font-display` family + Tailwind weight utilities (`font-medium/semibold/bold`)
  — visually identical.
- **Icons:** `lucide-react` (the web port of Feather, which mobile uses) as
  placeholders until real assets/screenshots exist. `PhoneMock` and the hexagon
  in `Wordmark` are placeholders, meant to be swapped for real imagery later.
- **Colorblind-safe:** if any win/loss/draw indicator is shown, pair the color
  with a W/L/D letter badge — never color alone.

The **waitlist form (`WaitlistForm`) is intentionally logic-free** — `onSubmit`
only calls `preventDefault()`. Don't wire it to a backend without a dedicated
slice.

## Supabase & env

Postgres is the single source of truth (see `../../supabase/CLAUDE.md`). When a
client is added, it belongs in this app (e.g. `src/lib/supabase.ts`), **not** in
`@riftlog/core`. Env contract — publishable key only, `NEXT_PUBLIC_`-prefixed
(anything without that prefix is server-only):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_…` key, gated by
  RLS. **Never** reference the secret key (`sb_secret_…`) from this app.

`.env.local` is gitignored; `.env.example` is the committed contract.

## Riot policy

Any public web UI must carry the fan-made disclaimer and must not publish or
retain cross-user metagame aggregates (see the Riot policy section in
`../../CLAUDE.md`). A user seeing their own stats is fine; aggregation is not.

## Intentionally not built yet

Only the marketing one-pager exists. Not built (don't add ahead of its slice):
waitlist submission/backend, the Supabase client, auth/session wiring, any data
reads/writes, additional routes (privacy/terms), real logo/screenshots/OG image
(placeholders only for now), and analytics.
