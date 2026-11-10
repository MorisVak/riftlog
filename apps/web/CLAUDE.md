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
- `src/components/` — sections (`Hero` → `HeroPhone` + `ModeSwitch`,
  `FaceOff`, `Sections` → `Beat`, `HowYouPlay`, `ComingLater`,
  `WaitlistCta`), chrome (`SiteHeader`,
  `SiteFooter`, `LegalPage`), and shared bits (`Wordmark`, `WaitlistForm`,
  `ContactForm`, `PhoneFrame`, `Reveal`, `LoopVideo`). `screenshots.generated.ts` is generated — don't edit.
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

### Background structure

Sections carry a faint background texture with a soft accent glow, fading
out toward the edges (`Backdrop`; the owner likes structure in the
background — any texture, as long as it isn't noisy, 2026-11-10). Each
texture means something where it sits: graph paper behind the hero (a score
sheet), lines at the versus cut's 11° behind the face-off, dots for Before
the match, the roadmap and the waitlist, a honeycomb at the table (the
logo's hexagon, the series pips), ruled lines after the match (a log).
Always the `border` token, kept faint (lines fainter than dots). Its focus
follows the section's picture: `right` / `left` behind the phones (beats
alternate with them; the hero keeps its own glow), `center` for the
face-off and the roadmap, `frame` (wide) around the waitlist card. The thin
details strip has none.

### Motion

Sections fade in and rise once as they scroll into view: wrap them in
`Reveal` (`delay` staggers siblings). The hidden start state is CSS
(`[data-reveal]` in `globals.css`), so there's no flash. A sideways-scrolling
row uses `<Reveal group>` with `data-reveal-child` items, because an item
that's off to the side never "intersects" on its own. The hero uses
`.animate-rise` on load. Under `prefers-reduced-motion` nothing moves, and a
`<noscript>` style in `layout.tsx` shows everything without JS.

### Screenshots and icons

**Taking the shots** in the app's **demo mode** (`apps/mobile/lib/demo.ts`:
start Metro with `EXPO_PUBLIC_DEMO=1` — a varied, made-up history with
fictional opponents around the owner's real Rivon deck; nothing is saved,
so a demo match may be played to the end). Card art is allowed in shots
and clips. Set a clean status bar with
`xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`,
capture with `xcrun simctl io booted screenshot screenshots-raw/<name>.png`,
and `xcrun simctl status_bar booted clear` afterwards. Mouse-wheel scrolling
doesn't work in the simulator; drag slowly (mouse down, small moves, pause,
release) to avoid flinging. Outside demo mode, **never finish a match or
add notes** on the owner's account without asking, and blur real people's
names (`blur` boxes). Writing files into the repo while recording makes the
dev client flash a blue "Refreshing…" banner — cut around it.

- **Screenshots:** raw iPhone PNGs go in `screenshots-raw/` (gitignored),
  named per the `SHOTS` list in `scripts/process-screenshots.mjs`;
  `pnpm --filter @riftlog/web screenshots` blurs `blur` boxes and writes
  1x/2x WebP plus the size manifest. Every shot is **the whole screen**,
  Dynamic Island included (the Simulator captures it), so `PhoneFrame`
  draws nothing over it — no empty band. The 9:41 status-bar override drops
  off after a rotation, so shots with the time get `hideStatusBar` (time
  and icons painted out) and every phone looks alike. Never crop a phone
  shot on one side only: that once pushed the sideways board off center.
  Landscape shots are captured with Simulator cmd+← (`rotate: 270`, island
  on the left), so the hero's phone turns counter-clockwise into them.
  Every phone carries the island — keep it that way (no cropped shots).
  URLs carry a version (`?v=`, a hash in the manifest; `v` in `videos.ts`
  for clips — bump it on a re-cut), so a retaken file is never served
  stale.
- **Page order:** hero → face-off clip → three **beats** of a match
  (`Beat`: Before the match / At the table / After the match) → a one-line
  details strip (`HowYouPlay`) → the roadmap (`ComingLater`, the rail of
  cards over the dot grid — the owner likes it; a slimmed version was
  reverted, 2026-11-10) → waitlist. Each beat is a heading,
  one sentence and **three short lines** beside **one or two phones**,
  alternating sides (`flip`); every phone is the same size (`PHONE_W`) —
  never size phones by count — and **never cut off at an edge**: the phone
  column is the wider one, and on narrow screens phones shrink to half the
  width instead of scrolling sideways. Stills only. Tried and rejected: clips and
  mixed-size tiles in the features, a feature explorer (owner, 2026-11-05),
  and rows of four phones under bullet lists — too much at once
  (2026-11-10). Prefer cutting a feature from the page over adding a
  screen. Copy never names third-party sites (deck builders etc.).
  **The hero shows both scoring modes** (owner, 2026-11-10): a Detailed /
  Simple switch (`ModeSwitch`, centred above the hero phone, no caption —
  the board shows the difference) crossfades between
  `board` / `board-simple` upright and `board-landscape` /
  `board-simple-landscape` sideways — the same moment (game 2 vs Alex,
  5–3) in both modes, so only the controls change. Retake them as a set.
  The "At the table" beat shows `who-won` instead, so the board isn't
  repeated. The header links
  follow the page: Decks · Scoring · History · Roadmap.
- **Recordings** (`public/videos/<name>.mp4` + `.webm`, listed in
  `src/components/videos.ts`): record with
  `xcrun simctl io booted recordVideo --codec=h264 --force screenshots-raw/<name>.mp4`
  (stop it with `pkill -INT -f "simctl io booted recordVideo"`), find the cut
  points on a contact sheet (`ffmpeg -i x.mp4 -vf "fps=10,scale=-1:160,tile=20x4"
  -frames:v 1 sheet.png`), then cut and encode H.264 (`-crf 26 -movflags
  +faststart`, no audio) and VP9 (`-crf 38 -b:v 0`). The face-off (`intro`)
  is the whole screen (`transpose=2,scale=1592:-2`, no crop) and loops
  cleanly: it fades in from `#0D1B2A` (0.25 s), plays the intro and a moment
  of the board, and fades out (0.35 s) — no frozen frame. `LoopVideo` plays
  only while on screen, never with reduced motion (the poster still stands
  in). Only the face-off is a clip.
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
