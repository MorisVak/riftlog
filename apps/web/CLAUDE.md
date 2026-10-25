@AGENTS.md

# @riftlog/web

Next.js 16 app, App Router, React 19, Tailwind CSS v4, TypeScript strict.
The riftlog.net website. Today it's a **marketing one-pager** with a working
waitlist, plus `/contact`, `/privacy` (Privacy Policy), `/terms` (Terms of Service) and
`/legal-notice` (Legal Notice = Impressum; `/impressum` redirects there). Copy stays
short and plain. No product functionality
(no auth, no match data) lives here. The page describes **only what the app
actually does**; planned features go only in the "Coming later" section, and
any stats wording stays strictly personal (Riot policy).

Parent conventions in `../../CLAUDE.md` (pnpm-only, Riot policy, the
publishable-vs-secret key boundary) apply. `@AGENTS.md` above is
`create-next-app`'s warning that this Next.js major has breaking changes vs.
older training data — check `node_modules/next/dist/docs/` when unsure.

## Project structure

- `src/app/` — App Router routes. `layout.tsx` (root layout, fonts, site
  metadata), `page.tsx` (the one-pager), `contact/`, `privacy/`, `terms/`,
  `legal-notice/`, `actions/` (`waitlist.ts`, `contact.ts` Server Actions), `opengraph-image.tsx` (link preview,
  rendered at build), `favicon.ico` / `icon.svg` / `apple-icon.png`
  (generated), `globals.css` (Tailwind entry, tokens, reveal motion).
- `src/components/` — sections (`Hero`, `Sections` → `FeatureSection`,
  `HowYouPlay`, `ComingLater`, `WaitlistCta`), chrome (`SiteHeader`,
  `SiteFooter`, `LegalPage`), and shared bits (`Wordmark`, `WaitlistForm`,
  `ContactForm`, `PhoneFrame`, `Reveal`). `screenshots.generated.ts` is generated — don't edit.
- `src/lib/legal.ts` — `OPERATOR` (the operator's legal details, used by all
  three legal pages), `PRIVACY_VERSION`, `LEGAL_UPDATED`.
- `src/lib/rpc.ts` — `callStatusRpc`, the one PostgREST call both Server
  Actions use (publishable key; import only from `"use server"` files).
- `scripts/` — `process-screenshots.mjs` and `generate-icons.mjs` (see below).
- `assets/` — build-time inputs: Space Grotesk TTFs (+ OFL licence) and
  `og-board.png` for the link preview.
- `public/` — `screenshots/` (generated) and `riot.txt` (Riot developer
  verification — **never change or move it**).
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
`win`/`loss`/`draw`, `conquer`/`hold`/`special`, `added`/`cut` and
`domain-*` families, and the `shadow-accent-card`/`shadow-accent-btn` glows.
`ink-tertiary` fails contrast as body text on `background`; use
`ink-secondary` for readable copy.

Rules (inherited from mobile):
- **No arbitrary hex.** Every color is a token; if you need a new one, add it to
  the `@theme` block first (and keep it in sync with the mobile config).
- **Fonts:** Space Grotesk (display/UI) + IBM Plex Mono (numerals), loaded via
  `next/font/google` in `layout.tsx` as `--font-space-grotesk` /
  `--font-ibm-plex-mono`, exposed as the `font-display` / `font-mono` tokens.
  Unlike mobile (separate per-weight family tokens), web uses the single
  `font-display` family + Tailwind weight utilities (`font-medium/semibold/bold`)
  — visually identical.
- **Icons:** `lucide-react` (the web port of Feather, which mobile uses). The
  brand mark is the wordmark badge (accent rounded square + hexagon).
- **Colorblind-safe:** if any win/loss/draw indicator is shown, pair the color
  with a W/L/D letter badge — never color alone.

### Motion

Sections fade in and rise once as they scroll into view: wrap them in
`Reveal` (`delay` staggers siblings). The hidden start state is CSS
(`[data-reveal]` in `globals.css`), so there's no flash. A sideways-scrolling
row uses `<Reveal group>` with `data-reveal-child` items, because an item
that's off to the side never "intersects" on its own. The hero uses
`.animate-rise` on load. Under `prefers-reduced-motion` nothing moves, and a
`<noscript>` style in `layout.tsx` shows everything without JS.

### Screenshots and icons

**Taking the shots** (the iOS simulator with the owner's real data): set a
clean status bar with
`xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`,
capture with `xcrun simctl io booted screenshot screenshots-raw/<name>.png`,
and `xcrun simctl status_bar booted clear` afterwards. Mouse-wheel scrolling
doesn't work in the simulator; drag slowly (mouse down, small moves, pause,
release) to avoid flinging. For board / between-games shots, start a test
match and leave with ✕ → "Exit and discard": an unfinished match is never
saved. **Never finish a match or add notes** on the owner's account without
asking — that writes to their history. Before processing, look at every raw
shot and list other people's names for the owner to decide (blur them via
`blur` boxes).

- **Screenshots:** raw iPhone PNGs go in `screenshots-raw/` (gitignored —
  real data), named per the `SHOTS` list in `scripts/process-screenshots.mjs`;
  `pnpm --filter @riftlog/web screenshots` crops the status bar, **blurs other
  people's names** (per-shot `blur` boxes in raw pixels), and writes 1x/2x
  WebP plus the size manifest. Render them only through `PhoneFrame`.
  `board-landscape` is the board held sideways (Simulator cmd+→, captured with
  the same `simctl` command): `rotate: 90` turns it after the status-bar crop,
  and `PhoneFrame` draws the island band on the right for any shot wider than
  tall. Only the hero shows it, via `HeroPhone`'s rotate button. Never
  show the deck Gallery view (placeholder tiles) or Riot card art.
- **Icons:** `pnpm --filter @riftlog/web icons` renders the badge into the web
  favicons **and** the mobile app icon, Android adaptive layers and splash
  mark. A changed app icon only reaches a device with a new native build.

## Waitlist and contact form

`WaitlistForm` → `joinWaitlist` (`src/app/actions/waitlist.ts`) → the
`join_waitlist` RPC, and `ContactForm` → `sendContact` (`contact.ts`) → the
`submit_contact` RPC, both via `callStatusRpc` with the publishable key (no
Supabase client dependency). Both forms have a hidden `company` honeypot.
The contact form is the Legal Notice's second contact channel, so it must
keep working. Waitlist statuses: `ok | invalid_email | rate_limited | error`.
A repeat address answers `ok` (no enumeration). The waitlist is **one launch
email, not a subscription** — never call it "subscribe" / "unsubscribe" in
copy. Each signup stores
`PRIVACY_VERSION` as the consent record — bump it when the policy changes in a
way that matters for the list. Single opt-in for now. Schema in
`../../supabase/CLAUDE.md`.

## Legal pages

`/privacy`, `/terms`, `/legal-notice` share `LegalPage` (a "Legal" label,
title, one-sentence intro, "Last updated"). They're final; the owner reviewed
them. Any change to them needs the owner's sign-off. **Keep them short and plain** like
riftatlas.com's: plain-English headings, no numbering, first person ("I"),
legal bases described in words rather than article numbers — but every fact
GDPR Art. 13 requires (who, what, why, processors, retention, rights,
complaint) must stay. Operator details live
only in `OPERATOR` (`src/lib/legal.ts`); a value still in `[[BRACKETS]]` is a
placeholder and renders highlighted (`Fill`). **Never invent the operator's
name, address or contact details.** Find what's left with
`grep -rn "\[\[" apps/web/src`. If the app starts processing new kinds of
personal data, update `/privacy` in the same change. The footer carries the
fan-made disclaimer **and** Riot's Legal Jibber Jabber statement, verbatim.

### Gotchas

- **Text right after a filled `<Fill />` loses its leading space** when
  rendered (`…gmail.comand`). Always write an explicit `{" "}` after `<Fill />`
  before text. Check with
  `grep -nE '<Fill [^>]*/> [A-Za-z(&]' apps/web/src/app/*/page.tsx`.
- **Renaming or moving a route** leaves `.next/types/validator.ts` pointing
  at the old path, and `pnpm typecheck` fails until you `rm -rf .next/types`
  and build again.

## Deployment

Vercel builds `main` (root directory `apps/web`); riftlog.net forwards to
www.riftlog.net. `metadataBase` in `layout.tsx` is `https://riftlog.net`;
switch it to www, or make the apex the primary domain in Vercel, if link
previews should skip the forward. Env vars: the two `NEXT_PUBLIC_SUPABASE_*`
values as type **Config**, in Production and Preview; redeploy after any
change. Check a deploy with
`gh api "repos/MorisVak/riftlog/deployments?sha=<sha>&environment=Production"`.

**Testing the forms against the live database** writes real rows. Use an
`@example.com` address, then delete the row and the matching
`*_attempts` rows with the secret key from `../../supabase/.env`, via the CLI
only (PostgREST `DELETE` with `apikey` + `Authorization: Bearer`). Never put
the secret key in this app or in Vercel.

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

Not built (don't add ahead of its slice): a Supabase JS client, auth/session
wiring, any product data reads/writes, double opt-in for the waitlist, sending
the launch email, and cookies (the privacy policy promises none — adding any
means updating it first). Analytics is limited to **Vercel Web Analytics**
(`<Analytics />` in `layout.tsx`, cookieless page-view counts, described in
`/privacy`); enable it per project in the Vercel dashboard. Don't add custom
events with personal data, or any other analytics, without updating
`/privacy` first.
