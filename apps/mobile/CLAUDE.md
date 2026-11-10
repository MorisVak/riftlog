# @riftlog/mobile

Expo SDK 54 app, Expo Router file-based routing, React 19, NativeWind v4
for styling, TypeScript strict.

Parent conventions in `../../CLAUDE.md` (pnpm-only, Riot policy, etc.) apply.

## Project structure

- `app/` — Expo Router routes. Each file is a screen.
  - `_layout.tsx` — root layout: `AuthProvider` > `ProfileProvider` >
    `MatchProvider` > `Stack` (with the onboarding guard, see below)
  - `(tabs)/_layout.tsx` — tab navigator: **Home · History · Decks ·
    Profile**. Home first (the app opens on it), then by how often they're
    used. One kind of thing per tab: decks are content, so they have their
    own tab; Profile is you and your settings, kept a tab (not a header
    avatar) so settings are in plain sight. The bar is our own
    (`components/tabBar.tsx`, passed as `tabBar`): a rounded bar floating
    just above the bottom edge, a soft accent pill behind the active tab
    that glides to the next on a tap (Reanimated spring), that tab's icon
    popping (1.18× and back), a light haptic on press. **No screen
    transition between tabs:** `animation: 'fade'` was tried and flashed
    bright between the dark screens — don't bring it back. Hidden (renders
    nothing) during a match.
  - `(tabs)/index.tsx` — Home; also hosts the whole match flow by `phase`
  - `(tabs)/history.tsx` — match history (account-gated)
  - `(tabs)/decks.tsx` — your decks: the title row carries Select and
    Import (as History's carries Select), then search + sort, rows with
    swipe / multi-select delete (account-gated)
  - `(tabs)/profile.tsx` — you and your settings: an identity card, then
    three sections, each one card of the same rows (`Section` / `Row` in the
    file: a round lead, label, value or control, chevron) and **no hint
    text under them** — a page of grey footnotes read as clutter and
    "AI-ish" (owner, 2026-11-10). **Playing**: Default deck (its legend's
    face as the lead; opens the `DeckPicker` sheet), **Scoring mode** (opens
    `components/scoringSheet.tsx`: the two boards as preview cards, see
    below), Legend art. **Riftlog**: Send feedback, the
    feedback inbox (admins), Buy me a coffee (opens the browser).
    **Account → Sign out / Delete account** (one destructive confirm; an
    Apple account then confirms with Apple once more — `appleAuthorizationCode`
    → `revokeAppleSignIn` → the `revoke-apple` function — with "Delete
    anyway" if Apple can't be reached; then the `delete_my_account` RPC and
    a local sign-out)), Riot's statements at
    the bottom (account-gated).
  - `legend-art.tsx` — which art **replaces a legend's standard art**:
    "Prefer overnumbered art", a per-legend pick (a grid of every legend;
    tap for its printings, "Automatic" to undo), and "Use in decklists"
    (on by default). Saved on the profile (`profiles.legend_art`,
    `setLegendArt`). Core's `legendArtPrinting` applies it only where the
    deck's printing is the standard one — a deck with a special printing
    (overnumbered / signed / alt art / promo, from a deck code) keeps it; a
    text import always gets the standard art, which is why this exists.
    Used by `cardArt.tsx` everywhere: backdrops and portraits always,
    decklists (`CardArt`) and the **card sheet** unless "Use in decklists"
    is off — the sheet resolves the printing itself so its art *and* its
    number / set / artist match what the decklist showed (tapping a legend
    must not jump back to the standard art). `asPrinted` shows a printing
    exactly (the picker, the sheet). Deck codes never change. Sign
    out is a row in Account, not an icon by your name, so a stray tap
    can't reach it.
  - `login.tsx` / `verify-otp.tsx` — modal auth routes
  - `onboarding.tsx` — first-login handle + display-name step (guarded),
    plus the scoring choice (saved right after `complete_onboarding`,
    non-fatal)
  - `decks/import.tsx` — paste-a-decklist import (modal)
  - `decks/[id].tsx` — one saved deck, read-only
  - `feedback.tsx` — the feedback inbox (feedback admins only)
- `components/` — reusable UI components; deck UI lives in `components/deck/`
- `contexts/` — React context providers (`authContext`, `profileContext`,
  `matchContext`)
- `hooks/` — shared hooks that aren't components (`useScreenIntro`)
- `assets/` — icons, splash images. The app icon, Android adaptive layers,
  splash mark and web favicon are **generated** from the wordmark badge by
  `pnpm --filter @riftlog/web icons` (`apps/web/scripts/generate-icons.mjs`) —
  regenerate rather than editing the PNGs. A new icon or splash needs a new
  native build to show on a device.

## Styling

NativeWind v4. Tailwind classes via `className`.

- `tailwind.config.js` defines content paths (`./app/**`, `./components/**`)
  and includes the NativeWind preset.
- `global.css` at `app/global.css` has the three Tailwind directives.
- Imported once in `app/_layout.tsx`.
- Don't add `StyleSheet.create(...)` — use NativeWind classes.
- **No inline hex.** Never use arbitrary values like `bg-[#7A1F2B]`. Every
  color comes from a token below. If you need a color that isn't a token,
  add it to `tailwind.config.js` first.
- **A rem is 14pt on native, not 16.** Size classes are smaller than their
  web names suggest (`w-20` = 70pt, not 80). Where a size must match a
  number in code — a swipe distance, a measured offset — set it as a style
  from that constant, not as a class (the swipe-to-delete strip bug).

### Design tokens — Archive Periwinkle

The palette lives in `tailwind.config.js`. Token names match the design
system 1:1 so there's no translation step from design to code.

**Base & surface** (darkest → lightest):

- `bg-background` `#0D1B2A` — app background
- `bg-surface` `#18223A` — cards, panels
- `bg-elevated` `#222D47` — raised surfaces (modals, menus)
- `border-border` `#3E506E` — hairlines, dividers

**Accent** — periwinkle, the single brand accent:

- `bg-accent` / `text-accent` `#8B93D9` — primary accent (buttons, active states)
- `accent-strong` `#6D74C4` — pressed / emphasis
- `accent-soft` `#A6ADE6` — lighter accent (e.g. icons on dark)
- `accent-deep` `#14182B` — very dark periwinkle wash (subtle fills)
- Translucent accent fills use opacity, not a token: `bg-accent/15`.

**Text** — under the `ink` family (named `ink`, not `text`, to avoid the
`text-text-*` class collision):

- `text-ink-primary` `#E4E5F2` — primary text
- `text-ink-secondary` `#868FB0` — secondary / labels
- `text-ink-tertiary` `#5E6788` — muted / disabled

**Results** — `win` / `loss` / `draw`, four tokens each:

- `bg-win` `#22C55E` · `text-win-text` `#4ADE80` · `bg-win-tint` `#385041` · `bg-win-deep` `#052E13`
- `bg-loss` `#EF4444` · `text-loss-text` `#FB8181` · `bg-loss-tint` `#573D3D` · `bg-loss-deep` `#2A0606`
- `bg-draw` `#C6A864` · `text-draw-text` `#D8C290` · `bg-draw-tint` `#524D42` · `bg-draw-deep` `#2B2102`

Role of each result token:

- base (`bg-win`) — the colored left bar, badge fill, solid indicator
- `-text` (`text-win-text`) — result text on a dark background
- `-tint` (`bg-win-tint`) — muted row / cell highlight on surface
- `-deep` (`bg-win-deep`) — faint full-bleed background wash

**Scoring actions** — `conquer` (green), `hold` (gold), `special` (pink), each
with a dark `-tint` for the button fill:

How a point was taken, on the play board. A separate family from win/loss/draw
on purpose — those describe a *result*, these describe an *action*, and mixing
them would make either impossible to restyle alone.

**Deck changes** — `added` (green) and `cut` (red), each with a dark `-tint`
for the count badge, used only by "Show changes" in the decklist. Their own
family: a deck edit isn't a result or a scoring action.

**Chosen champion** — `chosen` (gold) and `chosen-tint`: the gold frame on
the chosen champion's art in the decklist (list and gallery) plus its gold
"CC" chip (the players' short form; read as "Chosen champion" by screen readers) (`CardRow` / `CardGrid` `chosen`, `CardArt` `chosen`). Its own
token: gold elsewhere means a draw (result) or a hold (scoring action).

**Domains** — `domain-{fury,calm,mind,body,chaos,order}` (base) and
`domain-*-tint` (dark chip fill), for deck views: domain chips and the rune
proportion bar. An identity family, separate from results and scoring actions.

- fury `#E5484D` / `#3A1A1D` · calm `#3FB27F` / `#15332A` · mind `#4C8DEB` / `#172A45`
- body `#E8883A` / `#3A2716` · chaos `#9D6CE6` / `#2A1D42` · order `#E6C35C` / `#3A3219`

NativeWind only compiles class names that appear literally in source, so
per-domain classes come from the `DOMAIN_CLASSES` map in
`components/deck/domain.tsx` — never build `bg-domain-${d}` at runtime. Chips
always show the domain's name, so color is never the only signal.

**"Active" is always the accent, never a result color.** The game in progress
(the board divider's pip) and a paused clock's control both use `accent` plus
its glow — the same periwinkle the Start-match CTA and the board's END pill
carry. Don't reach for `draw`'s gold or introduce a second highlight color:
result colors mean results.

**Shadows: prefer a plain RN style object over a NativeWind `shadow-*` class on
the play board.** NativeWind parses those classes at render time, and on this
stack (expo-router + NativeWind) that has been implicated in spurious
"Couldn't find a navigation context" errors — the board clock's capsule and the
paused-clock control both threw it until their shadows moved to style objects
(`CLOCK_SHADOW` / `ACCENT_GLOW` in `playField.tsx`, values mirroring the
tokens). The onboarding Continue button hit it too — its `shadow-accent-btn`
was toggled on as the form became valid — and now uses `CTA_GLOW`. The
`shadow-accent-*` classes elsewhere are fine as they are; if a new one starts
throwing, this is the first thing to try. Note the stack trace can point at an
unrelated hook (it blamed `useSafeAreaInsets`); the Metro log's code frame
names the real element. See
https://github.com/expo/expo/issues/38423.

**Icons take token classes, not hex.** `components/icon.tsx` is Feather wrapped
with NativeWind's `cssInterop`, so `<Icon name="user" className="text-ink-tertiary" />`
routes the class's color into Feather's `color` prop. Use it for new icons
instead of mirroring a token as a hex constant. Likewise a `TextInput`'s
placeholder color comes from the **`placeholder:` variant** in its `className`
(`placeholder:text-ink-tertiary`), not `placeholderTextColor`. Note:
`placeholderClassName` type-checks but does nothing at runtime in NativeWind v4.
(Older screens still use the hex-constant pattern; migrate them opportunistically.)

**Section headings are sentence case, never all caps.** Use
`font-display text-base text-ink-secondary` (16px) for sub-headings and field
labels ("My decks", "Main deck", "Deck name") — at least as large as the
15px header actions beside them ("Select", "Import deck"). The old
`text-xs uppercase tracking-wider` label style was retired as hard to read.

**One avatar.** `components/avatar.tsx` is the only avatar in the app — profile,
onboarding, and later match mode and friend lists: a `user` silhouette in a
`bg-surface` circle, sized by a `size` prop. There are **no profile pictures**
anywhere (none stored, none read from the identity provider), so it has no
image prop on purpose. Don't add one.

**One place for card art.** Every card on every deck surface renders through
`components/deck/cardRow.tsx` (list), `components/deck/cardGrid.tsx`
(gallery), the deck header or the card sheet → `components/deck/cardArt.tsx`,
the single spot art is decided. Don't render card images anywhere else.
Deck cards (the Decks tab's rows and the deck field of `DeckPicker` —
Home's "Your deck", Profile's "Default deck", match setup's "Your deck") show their
legend's art as a backdrop — `CardBackdrop`, also in `cardArt.tsx`: the art
on the right ~70%, fading into the card's fill (`fill` = surface / elevated,
so a selected row has no seam), the date on a dark pill so it reads over any
art. Flag off → no backdrop, the old look. Pressing one lays
`components/pressOverlay.tsx` (a dark layer) over the whole card, art
included — a background change would hide under the art, and swipe rows
can't use opacity (the red delete action is behind them); the picker field
is a `TouchableOpacity`, which dims everything already. **The crop is per printing**
(`lib/legendArtFocus.json`: focus point + crop width), generated by
`pnpm catalog:legend-focus` from face detection, so every legend is framed
alike — face the same size, at `FOCUS_AT` (62%) across the box, right of the
fade. Hand-set crops for detection misses go in
`lib/legendArtFocus.manual.json` (they win on every run). A printing missing
from the file gets the default crop. Vision misses most **overnumbered**
art (stylised faces), so those all have manual crops: `x`/`y` the face's
centre, `w` ≈ 6.6 × the face's height (the generator's size rule, kept to
0.42–0.8), tighter for a face on the art's left so it lands right of the
fade (art never shows the card frame, so a left-side face can't move
further in otherwise). Check new ones on the `--sheet` contact sheet and
in the app. Art keeps the frame out with `FRAME_X` / `FRAME_Y` (7% / 5%)
and, in portraits, `ICON_COLUMN` (25%: the domain icons and their gold
bracket).

- **Matching** (`@riftlog/core` `matchCard`, via `hooks/useCardMatch.ts`): by
  `card.code` when present, else by normalized name to the card's base
  printing (`pickBasePrinting`, the same rule the importer uses). Nothing is
  written back to stored decks.
- **The catalog** (`contexts/catalogContext.tsx` + `lib/catalog.ts`): cached
  as one JSON file (`expo-file-system`, `Documents/catalog/catalog.json`) with
  its version. On launch and when a deck screen opens (throttled to 5 min) the
  app reads `catalog_meta.version` and refetches the whole catalog only if it
  moved. No per-card requests. Offline or before the first download, decks
  show as written (no types, no art, no flags).
- **Images** go through `lib/cardImage.ts`, which returns URLs to try in
  order (`CardImage` moves to the next on error): our bucket first — the
  240 px `cards/small/` copy for views up to 240 px, else the full copy —
  then Riot's CDN sized to the view, then the plain `image_url`. The bucket
  can't resize on request, so rows must use the small copy. Battlefields are
  drawn landscape (`orientation`).
- **Domain icons** are Riot's official ones, bundled in `assets/domains/`
  (`DomainIcon` / `DomainIcons` in `components/deck/domain.tsx`). Chips show
  icon + name, in deck views and the card sheet alike.
- **Rune symbols** are Riot's rune glyphs (colored circles), rendered from
  their SVGs to PNGs in `assets/runes/` (no SVG renderer in the app), plus the
  rainbow "any rune" (cropped tighter). `RuneIcon` draws one domain's rune, a
  **dual rune** (two domains: the circle split down the middle, half from
  each) or the rainbow; `InlineRune` is the in-text version. Card text draws
  `:rb_rune_<domain>:` / `:rb_rune_rainbow:` as these symbols, with spoken
  labels (each glyph has its own shape, so color isn't the only signal).
  `:rb_might:` is Riot's might glyph (`assets/icons/might.png`, rendered
  white from its SVG; `MightIcon` in `cardText.tsx`), also beside the card
  sheet's Might value.
- **Keyword badges** (`KeywordBadge` in `components/deck/cardText.tsx`):
  `[Tank]`, `[Ganking]` … render as slanted uppercase badges in the printed
  cards' four colors (`keyword-{teal,pink,lime,gray}` tokens; lime takes dark
  text). The keyword → color map is `KEYWORD_GROUP`; a keyword not in it is
  gray, so add new ones there when a set brings them.
- **"Choose one —" options are bullets** (`splitOptions` in
  `cardText.tsx`): every line after the first line ending in "—" is drawn as
  a bullet with a hanging indent. The sources mark these as lists (Riftcodex
  `<li>`, Riot "- "), but the importer stores them as plain lines; in all 17
  such cards today the options run to the end of the text.
- **The card sheet is a centered popup** (`components/deck/cardSheet.tsx`, a
  transparent fade `Modal` over `bg-background/80`; ✕ or a tap outside
  closes it), laid out after Piltover Archive's: art, name, chips (supertype
  + type, rarity, domains, then the card's `tags`), an Energy · Power · Might
  row (Power = one rune per point, dual for two-domain cards, rainbow with no
  domain; a gear's might reads "+3", it's a bonus), "Card text", and a "Card
  information" box (number, set, printing flags, artist). No prices.
- **Rarity gems** (Riot's, `assets/rarity/`, `components/deck/rarity.tsx`)
  sit in the sheet's rarity chip; "Promo" has none. The
  catalog cache has a format number (`CACHE_FORMAT` in `lib/catalog.ts`):
  bump it when the fetched columns change, so old caches refetch once.
- **Foil** (`components/deck/foil.tsx`, as on Piltover Archive): Rare, Epic
  and Showcase printings get a rainbow sheen over their art only where you
  look at the card itself — the card sheet, and the decklist's gallery tiles
  (`CardArt`'s `foil`; tiles default to off, so pickers like the legend grid
  stay plain) — a `foil`-token gradient three
  times the card's size, `mixBlendMode: 'color-dodge'` at 60%, sliding across
  and back (Reanimated, 3 s each way; still with Reduce Motion). No new
  dependency: blend modes are built into RN 0.81's New Architecture, and the
  card frame sets `isolation: 'isolate'` so the blend stays inside the card.
- **Art ships in every build**, store builds included (owner, 2026-11-07;
  the `CARD_ART` build flag that kept it out of `production` is gone). A
  card the catalog can't match still gets the named placeholder (rows stay
  text-only); types, text and flags always show.
- **The Legal Jibber Jabber statement appears once, at the bottom of the
  profile page** (`components/riotDisclaimer.tsx`: the fan-made disclaimer
  and the Legal Jibber Jabber statement, verbatim). Small and unobtrusive, but
  visible without opening anything, and always shown. Nowhere else in the app — not on deck screens, the card sheet or
  the import preview.
- **Flags, never color alone:** a card not in the catalog, a code that's a
  different card than its name, or a card of the wrong type for its section
  gets an icon + words on its row ("Not in the card catalog", "Unit in this
  section") or a "Check" badge on its tile, and the deck gets a summary line.
  Sections still come from the text export's headers; there's no "Unsorted"
  section.
- **Card art in the app is rendered here only**; the website shows it in pre-rendered screenshots and clips (allowed since 2026-11-05), never by loading images itself.

**Colorblind-safe rule (non-negotiable):** result color is NEVER the only
signal. Every win/loss/draw indicator pairs the color with (a) a `W`/`L`/`D`
letter badge and (b) a colored left bar. Don't convey result by color alone.

## Animation

Animations use **React Native Reanimated 4** (`react-native-reanimated`
~4.1.7) with `react-native-worklets` (0.5.1). Both already ship as deps with
the Expo template — there is nothing to install.

- **Don't touch `babel.config.js` for Reanimated.** `babel-preset-expo`
  (SDK 54) auto-configures the worklets Babel plugin. Manually adding
  `react-native-worklets/plugin` on top of the preset can double-transform
  worklets and break them.
- Reanimated 4 requires the **New Architecture (Fabric)**, which SDK 54
  enables by default. Don't disable it.
- Reanimated is a **native module**: if animations don't run after you add
  them, clear the Metro cache (`pnpm mobile start --clear`) and rebuild the
  dev client — a JS reload isn't enough.
- Prefer Reanimated over the legacy `Animated` API and over layout hacks.
  Use `useSharedValue` / `useAnimatedStyle` / `withTiming` / `withSpring`
  and `Animated.View`.

### Screen entrance

Every tab shares one entrance: elements fade in while rising ~10px, each
starting `STAGGER_MS` after the last, so the screen assembles top-to-bottom
instead of appearing at once (the design's `.scr` / scrIn). It lives in
`hooks/useScreenIntro.ts` — `useRise` (boxes), `useFade` (hairlines, which read
as sliding if they move), and `playIntro(values)`, where array order is the
stagger order.

Call `playIntro` from the screen's `useFocusEffect` so it **replays on every
focus**, not just mount. Each screen declares its own `useSharedValue(0)` per
element rather than the hook allocating them — the count differs per screen and
allocating in a loop would break the rules of hooks. Don't re-inline the timing
constants into a screen; three divergent copies is what prompted extracting
them.

To re-pin SDK-compatible versions (idempotent, safe to run):

pnpm --filter @riftlog/mobile exec expo install react-native-reanimated react-native-worklets

## Match state

Global state lives in `contexts/matchContext.tsx`. The `MatchProvider` is
mounted at the root in `app/_layout.tsx` so all screens can use `useMatch()`.

The current API:

```typescript
const {
  match, // Match | null
  gameStarted, // derived: match !== null && !match.endedAt
  currentGame, // derived: match.games[match.currentGameIndex]
  phase, // derived: 'idle' | 'playing' | 'between-games' | 'over'
  startMatch, // (config: MatchConfig) => void — format (Bo1/Bo3) + player names from setup
  resumeMatch, // (match: Match) => void — rehydrate an interrupted match on launch (MatchSync)
  endMatch, // () => void — discards the active match (completed-match write already happened)
  endGame, // (result: GameResult) => void — freeze current game, resolve match
  advanceGame, // () => void — start the next game of a Bo3 (after between-games)
  pauseClock, // () => void — stop the timed-match clock (no-op if untimed)
  resumeClock, // () => void — resume it, banking the pause
  incrementScore, // (playerId: 'p1' | 'p2') => void
  decrementScore, // (playerId: 'p1' | 'p2') => void
  setScore, // (playerId: 'p1' | 'p2', value: number) => void
} = useMatch();
```

`GameResult` is `PlayerId | 'draw'` (exported from `matchContext`): the result a
player declares when ending a game. `endGame` freezes the current `Game`
(`scoresAtEnd` / `winnerId` / `endedAt`), increments the winner's `gameWins`,
and resolves the match, setting `Match.winnerId` / `endedAt`. When a Bo3 isn't
yet decided the match sits in the `between-games` phase until `advanceGame`
starts the next game.

A Bo3 settles on any of three conditions — all in `endGame`:

- a player reaches **two game wins**;
- the **third game** is played (the `bestOf` cap; without it, draws would let
  `advanceGame` run into game 4, 5, 6…);
- a game is **drawn while someone leads** — a draw can't be replayed and yields
  no win, so 1–0 followed by a drawn game 2 is a match win for whoever took
  game 1, with no game 3. Level standings (an opening draw, or 1–1) still have
  something to decide, so they play on to the cap and settle as a match draw if
  still level.

A settled Bo3 can therefore have fewer than three games; nothing downstream
(overview, history, persistence) assumes a fixed count — they all map over
`match.games`.

**Pre-match setup** (`components/matchSetup.tsx`) is a **bottom sheet as tall
as its content**, in a transparent `Modal` (so it covers the tab bar too; it
has its own `GestureHandlerRootView`). It slides up on open, and drag the
handle down, tap outside or ✕ to close. Two layers: the outer takes the
slide and the drag, the inner is the sheet. The custom wheels sit in a
`Reveal` that animates its own height (0 ↔ measured), so the sheet slides up
and down with them frame by frame (a layout transition on the sheet wasn't
visibly smooth). It's capped below the status bar and its content scrolls
past that. (A native page sheet is always
full height on iPhone — it left empty space under short content.) Built around
the **matchup**: two legend portraits side by side — **you left (p1), the
opponent right**, "VS" between — each a `LegendPortrait` (the legend's art,
cropped on its face) you tap to choose, with the two name fields under them.
Below: **Your deck** (signed in, optional), **Format** (Best of 1 / 3) and
**Clock** (Off / 30 min / 60 min / Custom, which opens the wheels) as rows of
equal buttons, and **Start pinned at the bottom**, so it's always in reach.
Everything goes to `startMatch` as a `MatchConfig`; blank names fall back to
"You"/"Opponent", and signed in your name starts as your **display name**.
The two slots are **not interchangeable**: `p1` is always the device owner
and `p2` the opponent (see the p1-perspective rule below).

- **Your deck** (`components/deck/deckPicker.tsx`, "No deck" first — a field
  that opens a full-height page sheet of large deck rows, with search and a
  "Legend" filter once your decks span 2+ legends) pre-selects your **default
  deck** (`profiles.default_deck_id`) → `MatchConfig.deck` →
  `players[0].deck`. The picker's rows show each deck's legend art
  (`CardBackdrop`; fill stays `bg-surface`, selection is the accent border +
  check, a press is the overlay). On save only its `versionId` is written
  (`matches.deck_version_id`); History reads it back through `matches →
  deck_versions → decks` (current name, archived flag). With a deck chosen,
  your portrait shows its legend ("From Rivon"); "Clear" beside the label
  drops the deck.
- **Their legend (required — under internal testing):** the opponent
  portrait opens `LegendSheet` (`components/match/legendPicker.tsx`: every
  catalog legend as a searchable art grid, one tap picks). Start stays off —
  "Choose their legend first" — until one is picked, except with no catalog
  to pick from (first launch offline), so a match can always start.
- **Your legend:** your portrait always opens the same sheet, with
  `optional` ("Clear") — for a deck not uploaded yet, or a guest. Picking a
  legend other than your deck's drops the deck, so what's saved is what you
  picked; with a deck and no other pick, the deck's legend is used.
- Both are stored as `Player.legend` (a `CardRef`) inside `matches.players`
  — no migration; older matches simply have none.
- Start uses `CTA_GLOW`, not `shadow-accent-btn`: the button enables
  mid-form, and toggling that class throws "Couldn't find a navigation
  context".

Still deferred: the track-turns control. See the match flow before extending
it.

**Match rows show your legend.** History's rows draw your
legend as the row's backdrop — the same `CardBackdrop` as the deck cards, so
every legend's face comes out the same size — **untinted**: the result
already shows in the bar, the letter and the score color, and tinting every
row's art too was clutter (an earlier `mixBlendMode` tint also rendered every
row offscreen each frame and made expanding lag), with the title +
meta line and the score on soft dark pills. The legend is the one stored on
p1 with the match; for matches saved before that, the deck version played
(`fetchMatchHistory` selects just `list->legend`, no backfill), shown in the
**printing the deck uses now** when it's the same card (`yourLegendFor` in
`lib/historyView.ts` — older versions from text import name only the card).
The opponent's legend is stored but not shown in the row; the title is just
their name ("vs Opponent" when blank). Only your own matches are ever read
back — never aggregated across users (Riot policy). History's `FlatList`
**builds every row up front** (`initialNumToRender` = the row count, a large
`windowSize`): all matches arrive in one read anyway, and rows created
mid-scroll — each with art and, then, its own `FadeInDown` entrance — made
scrolling stutter. Rows have **no entrance animation** of their own; the
list fades in as a whole with the screen intro.
`HistoryRow` is `React.memo` (callbacks from History are stable), so a
selection change — which re-renders the list via `extraData` — redraws only
the rows it affects. Rows with a press overlay build their content **outside** the
`Pressable` children function (`const content = …`), so a press redraws only
the overlay, not the art. **Don't wrap `CardBackdrop` (or other components
rendered inside a `Pressable`) in `React.memo`:** NativeWind's css-interop
then throws "Component is not a function (it is Object)" and the app
renders a blank white screen.

**Every backdrop fades the same way.** The art always covers the whole
backdrop box (frame kept out), and the fade into the card's fill
(`FocusedArt`'s `edgeFade`, stops `FADE_STOPS`) runs across the box — one
ratio for every legend. Legends whose face fills their card (Vex - Gloomist
UNL-193, Kennen VEN-197) have crops in `lib/legendArtFocus.manual.json`
wider than the art (`w` > 1) to shrink the face; a backdrop zooms those in
until the art covers the box, so their faces come out somewhat larger.
That's deliberate: letting their art come out narrower (starting partway
into the box) was tried and read as cut off — the owner wants the same
fade for all. Setup portraits and banners use the crops as they are.

### Timed mode

`Match.timeLimitSeconds` (null = untimed) is the **only** timed-mode state.
There is no ticking value in context, no paused flag, nothing on `Game`:

- One clock covers the whole match and keeps running through the between-games
  break in a Bo3 (sideboarding is on the clock); only the board's pause control
  stops it.
- Remaining time is **derived from wall-clock** in `lib/clock.ts`
  (`limit - (now - game 1 startedAt)`), so it can't drift and needs no
  restoring after a background/reload/outbox resume. Don't add a stored
  countdown or a per-second reducer.
- At zero it keeps counting **into overtime** (`+mm:ss`, loss-colored, labelled
  `OT`). Nothing auto-ends — same rule as scoring.
- `components/matchClock.tsx` renders it and returns `null` when untimed, so it
  can be dropped in unconditionally. `variant="board"` sits quarter-turned in
  the play field's center band; `variant="screen"` is the between-games
  interstitial's, rendered twice (once rotated 180°) so both players get an
  upright clock.
- **The clock can be paused**, so it is *not* purely wall-clock derived any
  more: `Match.clockPausedAt` + `clockPausedMs` bank the pauses and
  `runningMs()` subtracts them. Still nothing ticks — a paused clock is a
  steady derived value, and `MatchClock` stops its own timer while paused.
  The finished match persists the total (`totalPausedMs` →
  `matches.clock_paused_ms`), and History's "played" subtracts it.
- **`MatchClock` reads `Date.now()` at render time and opts out of the React
  Compiler (`'use no memo'`).** Two bugs taught this: (1) rendering with the
  last tick's stored timestamp made the countdown jump UP by the pause length
  on resume (the pause is banked immediately, the stale timestamp predates it);
  (2) with `experiments.reactCompiler` on, reading `Date.now()` in render got
  memoized on `match` alone and froze the clock. The tick (`useTick`) only
  triggers re-renders. Any other component that reads the clock during render
  needs the same opt-out.
- **Rotating text needs an explicitly sized wrapper.** A transform is paint
  only — it doesn't change layout — so a rotated clock dropped into a narrow
  slot lays out at that slot's width and truncates (`50:00` → `2…`). The board
  clock sits in a wrapper with an explicit pre-rotation width (`CLOCK_W`), and
  the clock text also carries `adjustsFontSizeToFit` so it scales rather than
  ellipsizes if a box is ever too small.

### Board layout

The two halves are separated by a **line, not a bar** — no format label, no
game counter, nothing taking board space from either player:

- `components/boardDivider.tsx` draws the line. It **takes no height** (a
  0-height wrapper in `playField.tsx`, drawn over the seam): the halves and
  their legend art meet exactly at the line — as a plain row it left a ~16pt
  band of background between the two arts. For a Bo3 the series cells sit
  *inline* with it (line → cells → line) with **no gaps**, so the run reads as
  one connected honeycomb chain rather than dots on a rule. Cells are hexagons
  built from plain Views — a body rectangle plus a border-trick triangle at each
  end, with a smaller fill hexagon centered over an outline one to fake a
  stroke. There's no polygon primitive in RN and `react-native-svg` isn't a
  dependency; adding it would force a dev-client rebuild for one shape.
- Cell states: the game being played is `accent` filled with an `accent-soft`
  outline and a slow glow (2.2s breath, shadow opacity 0.45→0.95); decided games
  are solid ink; games not yet reached are hollow outlines, so the comb is
  visible from the start and fills in as the round is played.
- The clock and the controls float in an absolutely positioned `box-none`
  strip centered on the divider, so taps still reach the halves everywhere
  except on the buttons.
- Controls are the exit `✕` on the right, and — on a timed match — one
  pause/resume toggle (`Feather` `pause` ↔ `play`) sitting **with the clock**
  on the left, since it's the clock it acts on. Paused shows an accent outline
  + glow and greys the clock; there's deliberately no "PAUSED" label, which
  would grow the rotated capsule. Nothing else belongs here — the pass-turn
  control is still deferred.
- **Screen on, and landscape on the board only** (`hooks/useInGameScreen.ts`,
  called from the match flow in `(tabs)/index.tsx`). The screen is kept awake
  (`expo-keep-awake`) while a game or the between-games break is up. The app
  is portrait everywhere (`initialOrientation` in app.json) except those two
  match screens, which unlock rotation (`expo-screen-orientation`); it re-locks
  once the match is over. Never unlock it for menus. The between-games screen
  puts the banner left and the rest right in landscape, with its two clocks
  in opposite corners. In landscape the players sit at the long sides: each half keeps the
  numeral over its buttons (the numeral shrinks to 80px to fit), the name sits
  in one corner and **each player gets their own clock** in the other corner
  (END under yours) — a single clock on the divider only faces one of them, so
  the rotated capsule is hidden in landscape and the divider keeps just the
  hexagons, pause and ✕. Both halves use the wider side safe-area inset so they
  stay mirror images, clear of the notch. Layout reads `useWindowDimensions`
  (`width > height`), not the orientation API.
- **Each half shows its player's legend** behind it (`LegendBackground` in
  `components/trackingField.tsx`): the face crop under a 45% `background`
  layer and a vignette, turning with the half so it faces its player; the
  score and buttons stay the focus. **Sideways** each half is a wide, short
  strip, and art covering all of it was zoomed far past the image (blurry,
  face cut off): there the art is a panel on the player's own side (44% of
  the width, behind their name) fading toward the score over its last
  quarter — a face near the art's edge (Akali VEN-189) sits there. The player's name
  is larger and bold on a soft pill. **A take-back is quiet on purpose** — it's usually fixing a
  mis-tap: the numeral dips a little and tints toward `loss-text` for a
  moment (`scoringComponent.tsx`), with a soft haptic. (A red flash over
  the half plus a shake was tried and was too much.) At 0 a tap does
  nothing (and plays nothing).
- **Game-start intro** (`components/gameStartIntro.tsx`, over `PlayField`):
  a versus animation — both **legends** slide in from the sides (yours from
  the left) and meet at a slanted cut, like the match detail's banner; "VS"
  pops at the cut; each side's champion and player name settle in its
  bottom corner, and "Match start" / "Game 2" / "Game 3" plus the format sit
  at the top. A player with no legend gets their initial, large and faint.
  ~2.2s, tap to skip. Laid out a quarter turn (-90°,
  like the board clock) at the screen's landscape size (no turn when the phone
  is already landscape), so both players read
  it from the side and your side sits at your end. Turned, the names' bottom
  corners land at the screen's top and bottom, so they're inset by the
  larger safe-area inset (clear of the status bar and home indicator). It plays once per game id and
  only for a game that *just* started (no events, `startedAt` < 3s ago), so a
  restored match never replays it.
- History stores the configured limit and the total paused time; played time
  (excluding pauses) and the overtime flag are derived in `lib/historyView.ts`.
- Setup's Clock offers Off, two presets (30 / 60 min) and **Custom**, which
  opens `components/durationPicker.tsx` — minute/second wheels built from a
  snapping `ScrollView`, not a picker dependency. They open by height
  (`Reveal`), and the sheet scrolls to them if they'd open below the fold. A timed match at 00:00 can't
  start; the Start button disables and says so.

Conventions:

- **Two scoring modes** (Profile → Scoring mode and onboarding,
  `profiles.scoring_mode`, core `ScoringMode`). Both places pick with
  `components/scoringChoice.tsx`: two cards side by side, each with a small
  board that plays itself (points go on to 8, then a new game; a "+1" rises
  from Conquer / Hold / Special in turn, or the right half lights up), so
  you see how a board scores before choosing it. Plain Views, decorative,
  still with Reduce Motion. The modes: **Detailed** (the default, and what guests get) is the
  conquer / hold / special board below; **Simple** is a plain counter — the
  player's **whole half is the button**: anything left of the middle takes a
  point back, anything right of it scores one (`SimpleBoard`, an absolute
  fill of the tracking field; name, END and the clock are drawn after it so
  they keep their taps). A large − and + icon either side of the numeral
  (no button shapes — the whole side is the target) say which side does
  what — bright (`ink-primary` / `accent-soft`) with a soft dark halo
  (`ICON_HALO`, a text shadow) so they hold up over any legend art; a held side tints faintly, and the "+1" rises from the spot touched
  (`locationX/Y` of the press). The numeral holds
  two digits' width so the marks don't shift at 10. (Tried first and dropped:
  a − and a wide + under the numeral looked odd; round − / + buttons beside
  it were redundant once the halves became the target.) The mode is fixed on the
  match when it starts (`MatchConfig.scoringMode` → `Match.scoringMode`,
  absent = detailed), so a profile that loads late can't swap the buttons
  mid-game; it isn't saved to Postgres. Simple points are recorded as
  `PointEvent`s with `action: null`.
- **A point is scored by saying HOW** (Detailed). Under the numeral sit three buttons —
  conquer / hold / special — and **tapping the numeral takes a point back**;
  there is no separate decrement control. Every change is **recorded** on the
  current game as a `PointEvent` (`Game.events`: ms since the game started,
  player, ±1, and `conquer`/`hold`/`special`, or null for a take-back), in the
  same update as the score so they can't drift (`changeScore` in
  `matchContext`). A take-back at 0 records nothing. `setScore` jumps a score
  without events and isn't used by the board — don't wire it to UI.
- **Between games** (`components/betweenGamesScreen.tsx`, a Bo3's break)
  is built from the match detail's pieces, so the break already looks like
  the record it becomes: the **versus banner** for the game just played (its
  loser dimmed, "Game 1 · Won" over that game's score; about a third of the
  screen tall), a **series tracker** (one slot per game: the W/L/D letter on
  its result tint — the game just played pops in — the next game outlined in
  the accent with a play mark, a game not reached yet a dashed outline; the
  standing beside them), the game's in-place note (signed in), then the
  glowing "Start game N" low in thumb reach and "End round" (with a
  confirm). In portrait both clocks sit in the flow — the rotated one above
  the banner, yours at the bottom — so nothing floats over the content.
- **Match complete** (`components/matchOverview.tsx`) is the third of the
  set: the versus banner full bleed under the status bar (a soft shade keeps
  the time readable), `large`, with "Victory" / "Defeat" / "Draw" over the
  final score (a Bo1's points, a Bo3's games); "Match complete · Best of N";
  the detail's **Games** card (`GameCard`, score graphs included — the
  in-memory games go through the same `toDetailGameVM` as saved rows); the
  notes; and **Done pinned at the bottom**.
- **Match detail** (`app/matches/[id].tsx`, `fetchMatch` →
  `lib/matchDetailView.ts` → `components/match/gameCard.tsx`): a **versus
  banner** (`components/match/versusBanner.tsx`, shared with between games),
  edge to edge — your legend on the left, theirs on the right,
  meeting at a slanted cut (the right box is `skewX`-ed to clip, the art
  inside skewed back upright — no mask needed); the side that lost is
  darkened (a draw darkens neither), and the result word, the score and
  both names run along the bottom. Deliberately unlike setup's portraits (no
  "You"/"Opponent" tags, no boxes): a finished match gets its own look.
  Format, date and clock follow as one quiet line. Below, one rhythm: section
  label, one grouped card. **Games** is a single card with a line per game
  (`gameCard.tsx`: "G n", scores, a bar, W/L/D), **Deck** a tappable card
  with your legend's art (`CardBackdrop`), the deck name with an "Older
  version" chip when edited since (a chip, not a sentence), the legend's
  name, and a chevron — the owner prefers this over an upright-card variant
  that was tried — **Notes** a single card of in-place note fields.
  The per-game bars (fill = your share of points, `pointShare` in core) that
  expand into a score graph (`components/match/scoreGraph.tsx`, step lines
  drawn from plain Views — no SVG dependency), and your deck. The graph uses
  `scoreSeries` in core, which nets take-backs out first (`netPoints`: a -1
  cancels that player's latest point; neither is shown). Your line is colored
  per run by the scoring action that started it (`bg-conquer` / `bg-hold` /
  `bg-special`; `bg-accent` before your first point); the opponent's stays
  `ink-tertiary` so the two lines never share a color. A game scored on the
  Simple board (no point carries an action — core's `hasScoringActions`,
  `GameGraphVM.detailed`) keeps the graph, but your line is the plain accent
  and the legend reads just "You · Opponent". Validated for
  separation; the muted line is under 3:1 contrast, so both lines are always
  direct-labeled with their final score, and the legend explains the action
  colors.
  The VM builds on `toHistoryRowVM` so History and the detail can't disagree.
- **Notes** (`Game.notes`, `Match.notes`) are **written in place
  everywhere** — `components/match/inlineNote.tsx`: a label and a growing
  field, saved when it loses focus and only if changed. No modal editor
  (it was removed). On the **match detail** they save to Postgres
  (`updateGameNote` / `updateMatchNote`); on the **between-games** screen
  (in a small card, the screen shifts up for the keyboard) and the
  **match-complete** screen they go through `setGameNote` / `setMatchNote` in
  `matchContext` (signed-in only). Each screen ends editing on a tap on
  empty space (`Keyboard.dismiss`, which also covers a hardware keyboard);
  on match-complete a tap on Done first just ends editing (blurring the
  focused field via `TextInput.State`, hardware keyboard too), so a note
  is never lost. **A Bo1 has a round note only** — its one game *is* the
  round, so the match-complete screen and the match detail hide the game
  note (the detail still shows one that an older Bo1 already has). Text is stored via core's `normalizeNote` (trimmed,
  blank → null). **The match is already saved when the match-complete screen
  shows**, so `MatchSync` re-syncs a settled match whenever its notes change
  (`notesKey`), and every completed-match write goes through one promise
  chain (`enqueueWrite`) so a late first save can't overwrite newer notes.
  v1 is **your side only** — the opponent block (their deck, profile,
  head-to-head) waits for match mode.
- **Scoring is a manual tally — no auto-end.** Score can't drop below 0;
  there's no upper bound and no win-at-target logic. Games and the match end
  only via explicit user action (with a confirm prompt), so stray or accidental
  taps never close anything. END's prompt (`components/endGamePrompt.tsx`,
  "Who won game N?") shows both players as **legend tiles** side by side —
  face crop, champion + name, the score they're on — and you tap the
  winner; its frame is green on your side and red on theirs (the result the
  tap records for you). Below: Draw, and "Keep playing" (or tap outside).
- **"{name} wins" goes through `winsLabel`** (`lib/playerText.ts`). A blank
  name falls back to "You", and "You wins" isn't English — it returns
  "You win". Use it for any new winner text.
- **All score actions take a `PlayerId`, never a setter.** The old setter-
  passing pattern was removed in the refactor.
- **Player identity within a match is `'p1' | 'p2'`.** This is independent
  of any future Supabase user account (which would be a separate `userId`
  field on `Player`).
- **`p1` is always "you", `p2` always the opponent.** History derives
  win/loss/draw, score order (`you–them`), and the "vs {name}" row label from
  p1's outcome (`lib/historyView.ts`), and the board puts p1 on the near side.
  Don't render a bare player name anywhere in history — label the opponent.
- **Match and Game IDs are UUIDs** generated via `expo-crypto`. Don't use
  incrementing counters.
- **`gameStarted` is derived, not stored.** Don't add a separate flag.
- **`phase` is derived, not stored.** It's computed from `match` /
  `endedAt` / the current game's `endedAt` — don't add a stored phase field.
- **Dates are ISO strings**, not `Date` objects. Easier to serialize for
  Supabase later.

## Adding new score-like actions

Follow the existing pattern in `matchContext.tsx`:

1. Add the action signature to `MatchContextType`.
2. Implement using `updatePlayer(playerId, updater)` for player-scoped changes.
3. Use functional `setMatch((prev) => ...)` to avoid stale closures.
4. Return new objects (immutable update) — don't mutate in place.

## Haptics

`expo-haptics` is installed. Pattern:

```typescript
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // significant
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // win
```

Haptics don't work in the iOS simulator; test on a real device for the feel.

## Native module additions

Don't use `pnpm add <native-module>`. Use:

pnpm --filter @riftlog/mobile exec expo install <package>

Expo's resolver pins versions compatible with SDK 54. Plain `pnpm add` picks
latest, which usually mismatches and causes runtime errors.

To verify alignment with the SDK after installs:

pnpm --filter @riftlog/mobile exec expo install --check

**A native module means a new dev client.** After adding one (most recently
`expo-clipboard`), rebuild: `cd ios && RCT_USE_PREBUILT_RNCORE=0 pod install`
(see the iOS build section), then build for the simulator — XcodeBuildMCP's
`build_run_sim`, or Xcode. `expo run:ios --device "<simulator name>"`
misidentified the simulator as a physical device and failed on code signing.
**Restart Metro with `--clear` too**: a Metro started before the install
can't resolve the new package ("Unable to resolve module") even though it's
in `node_modules`. Physical devices need a new EAS build.

## Android differences

Found in the Android pass (2026-11-10); each fix is in the code, this is
the list to check new screens against:

- **No skews.** Android draws a skewed view square (RN decomposes the
  transform into translate / rotate / scale). Slanted cuts (versus banner,
  game-start intro) are a tall box rotated around `transformOrigin: 'left
  center'` with a counter-rotated layer inside — and a percentage
  `transformOrigin` on the inner layer made it vanish, so it uses `'left
  center'` too. Card text's keyword badges still use `skewX` and come out
  square on Android (cosmetic, open).
- **iOS shadows don't render.** `shadowColor` / `shadowOpacity` /
  `shadow-accent-*` are iOS-only, so every accent glow is flat on Android
  (open: `boxShadow`, which RN 0.81 draws on both).
- **Page sheets and modal routes are full screen**, under the status bar
  (edge to edge): pad them with `usePageSheetInsets` (`lib/pageSheetInsets.ts`).
  Transparent bottom-sheet Modals need `statusBarTranslucent` +
  `navigationBarTranslucent`, or the window stops short of the bottom and
  the sheet runs up behind the status bar. (Modal flags apply on a fresh
  start, not a fast refresh.)
- **The keyboard doesn't shrink the window** (edge to edge): keyboard
  avoiding views use `behavior="padding"` on both platforms; ScrollViews
  that rely on iOS's `automaticallyAdjustKeyboardInsets` are wrapped in
  `AndroidKeyboardAvoider`. Closing the keyboard ends editing
  (`useEndEditingOnKeyboardHide`, root layout), as on iOS — notes save on blur.
- **The back button.** The match lives in the Home tab, so back there
  closed the app: the match screens take it over (`useAndroidBack`), and
  select mode ends on back (`useSelection`).
- **Landscape keeps the status bar** unless hidden (`useInGameScreen` hides
  it while a match screen is sideways).

## Demo mode (screenshots and recordings)

`lib/demo.ts`. Dev builds only, switched on when Metro starts:
`EXPO_PUBLIC_DEMO=1 pnpm exec expo start --dev-client --clear` (restart
Metro without it to go back). Matches, decks and the default deck then come
from a generated, varied world instead of Postgres — the owner's real Riven
deck ("Rivon", read from the account, never changed) as the default deck,
four generated decks from real catalog cards, and a month of matches
against fictional opponents and all kinds of legends, with recorded points
for the graphs (fixed seed: the same every run). **Every write is skipped**
in demo mode (saving a match, notes, deck edits, deletes, the default deck)
— the guards sit in `lib/matchPersistence.ts`, `lib/decks.ts`,
`lib/profile.ts`. Sign-in, the profile and the legend-art setting stay real.
Use it for website shots so they don't show the owner's real history.

## Development

- Run on simulator: `pnpm mobile start` then press `i`
- Run on phone via Expo Go: `pnpm mobile start --go` then scan QR with iOS Camera
  (**Apple sign-in does not work in Expo Go** — `expo-apple-authentication` is
  a native module. Discord and Google are browser-redirect flows and do run in
  Expo Go, but use a dev build for anything touching auth.)
- Clear cache when config changes (Babel/Metro/tailwind): `pnpm mobile start --clear`

### iOS native build: RN must be built from source

A fresh `ios/` fails to link with:

```
Undefined symbols for architecture arm64
  _OBJC_CLASS_$_RCTPackagerConnection
  Referenced from: libexpo-dev-launcher.a(EXDevLauncherController.o)
```

RN 0.81.5 ships React Native as a **prebuilt** `React.xcframework`, and that
binary doesn't export `RCTPackagerConnection` — verified with `nm`: it has
`RCTDevMenu`, `RCTDevSettings`, and `RCTInspector*`, but zero matches for the
packager class that `expo-dev-launcher` links against. It is not caused by
anything in this project's source.

Fix — build React-Core from source instead:

    cd apps/mobile/ios && RCT_USE_PREBUILT_RNCORE=0 pod install

**Setting the env var on `expo run:ios` alone does nothing.** It skips
`pod install` when `Podfile.lock` is unchanged, so the flag never reaches
CocoaPods and you get the identical link error a second time. Run `pod install`
directly first, confirm `ios/Pods/React-Core-prebuilt/` is **gone**, then build.

Repeat after any wipe-and-prebuild of `ios/`. Clean builds get noticeably
slower, which is the trade. This is deliberately *not* baked into the Podfile:
`ios/` is gitignored and regenerated by prebuild, so a Podfile edit wouldn't
survive anyway — making it stick would need a config plugin, which is its own
decision.

## EAS

The project is configured for EAS Build:

- `apps/mobile/eas.json` has development, preview, production profiles
- `expo-dev-client` is installed for the development profile
- Apple credentials provisioned for `com.m-mecke.riftlog`
- One iPhone UDID is registered

Profiles: `development` (dev client), `preview` (internal) and
`production` (store: TestFlight, the App Store, Google Play). All carry card
art. Ship with `eas build --platform ios --profile production --auto-submit`.

Don't run `eas init`, `eas build:configure`, or change identifiers without
deliberate intent. The project on Expo's servers is `@m_mecke/riftlog`.

For simulator dev builds (free, no Apple credentials needed):
`eas build --profile development --platform ios --local`.

## Supabase & persistence

Postgres is the single source of truth for match data. The typed client lives in
`lib/supabase.ts` (**not** in `@riftlog/core`, which stays platform-agnostic):
`createClient<Database>` with the publishable key and an encrypted session store.
Schema, RLS, and types-gen are documented in `../../supabase/CLAUDE.md`.

**Env contract.** Two vars, both `EXPO_PUBLIC_`-prefixed — anything without that
prefix is **not** bundled into the app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_…` key, safe in
  the client and gated by RLS.

`.env` is gitignored; `.env.example` is committed. **Never reference the secret
key (`sb_secret_…`) from the app** — it bypasses RLS and is server/CLI-only.

**Storage adapter.** The auth session is stored via `LargeSecureStore` (Expo
SecureStore holds a per-key AES-256 key; AsyncStorage holds the ciphertext) —
the approach from the official Supabase Expo quickstart. That store holds the
**session only**. Offline match data uses plain AsyncStorage (see Offline
outbox) — we deliberately do **not** add a second storage library.

**Auth.** See the "Auth & guest mode" section below — it's load-bearing enough
to have its own.

**Write path.** There is no "match completed" callback — completion is
`match.endedAt` flipping non-null inside the matchContext reducers. `MatchSync`
(`components/matchSync.tsx`, mounted under `MatchProvider`) watches `match` and:

- mirrors the in-progress match to local storage on every change;
- on completion, calls `syncCompletedMatch()` (`lib/sync.ts`) — try Postgres,
  fall back to the outbox — then clears the in-progress slot;
- on launch, rehydrates an interrupted in-progress match (`resumeMatch`) and
  flushes the outbox.

`saveCompletedMatch()` (`lib/matchPersistence.ts`) upserts the match + its games
by client UUID. The DB never re-derives Bo3 / draw logic — it persists only what
the context settled.

**Offline outbox.** `lib/localStore.ts` is the bounded local store: exactly two
AsyncStorage keys — the single in-progress match and an outbox array of
completed-but-unsynced matches. `flushOutbox()` (`lib/sync.ts`, single-flight)
drains the outbox on reconnect (NetInfo), on app foreground (AppState), and after
any successful write; confirmed uploads are removed so the outbox trends empty
online. Both items self-clear. **Don't add a third local key or mirror history
locally** — keep the footprint to these two items.

**Read path.** History reads come straight from Postgres on demand
(`fetchMatchHistory()`), scoped to the caller by RLS — never mirrored locally.
The list reads each game without its recorded points or notes
(`LIST_GAME_COLUMNS`; the detail's `fetchMatch` reads `games(*)`) — that
halved the payload.

**Session cache (memory only, owner-approved).** `lib/sessionCache.ts` keeps
your matches (`matchHistoryCache` / `useMatchHistory`) and decks
(`myDecksCache` / `useMyDecks`) **in memory for the session** — nothing
written to the device, so the rule above holds. Screens show what was read
last at once and `refresh()` quietly on focus; an unchanged refresh keeps the
same objects, and a changed one reuses every unchanged row (`shareRows`), so
with `historyRowVM` (view-models cached per row object) and `React.memo` rows
only what changed redraws. Optimistic deletes go through `update()`. A failed
refresh keeps what's on screen; an error shows only with nothing cached.
Cleared on sign-out and on any account change (`authContext`); a saved match
or a flushed outbox refreshes the history. Use the named hooks — a method
called `.use()` was treated by the React Compiler like React's `use()` and
skipped on some renders (hook-order crash).

**Decks** (`lib/decks.ts`) follow the same rule: `fetchMyDecks()` /
`fetchDeck(id)` read on demand (the deck plus its current version's list,
narrowed with core's `isDeckList`, archived decks filtered out), never cached
on-device. The writes are `createDeck()` → the `create_deck` RPC,
`renameDeck()` → a plain update of `decks.name` (the one column clients may
write; the deck screen's pencil button), `updateDeckList()` → the
`update_deck_list` RPC (a new immutable version; matches keep the one they
pinned), and `deleteDeck()` → the
`delete_deck` RPC, a **soft** delete (see `../../supabase/CLAUDE.md`).
The Decks tab deletes like match history: swipe a row left
(`components/swipeToDelete.tsx`), confirm, the row drops optimistically and
comes back with an alert if the server call fails. A swipe row's card must be
opaque (`Pressable` + `bg-surface`, not `TouchableOpacity`) or the red action
shows through on tap.

**Editing a list** reuses the import screen: the deck screen's "Edit list"
pushes `/decks/import?deckId=…`, which pre-fills the box with
`formatDeckText(list)` — tweak a line to change a few cards, or Clear + paste a
whole new list. Same parser, preview, and error blocking as an import; Save is
off until the list actually differs (compared as formatted text). The name
isn't edited there. **Import and Edit list work the same way — one way to do
it, no tabs:** one decklist box, and an **"Import deck
code"** button above it that opens a code field (Paste, close). A good code —
typed, pasted there, or pasted into the decklist box — fills the box with the
list it stands for; the code stays visible with "Decklist updated from this
code.", or a plain error. A code never stays in the decklist box. Text
carries names only, so on save each
card gets its printing back (`withPrintingsFrom`): the pasted code's first,
else (editing) the deck's previous one; only new cards get the base printing.
An import whose list is still exactly the code's is saved with
`import_source = 'piltover_code'` and the code. Same
cards with other printings count as a change. If the legend differs, Save
asks first ("Change the legend?"). The deck screen re-reads on focus, quietly once shown, so
it reflects the edit on return.

**A match links to the list as played.** History's deck link and the match
detail's "Decklist" go through `deckHref` (`lib/historyView.ts`) to
`/decks/[id]?version=<pinned version>`. If the deck was edited since, the deck
screen shows that version read-only (no rename, no Edit list) under an
"Outdated version" note with a "See current list" link; if the version
is still current it's the normal view. The match detail says "You played an
earlier version" when it differs (`MatchDeckRef.edited`).

**List / Gallery.** The deck screen has a two-button switch beside the domain
chips (`LayoutSwitch` in `deckView.tsx`, state per visit — not persisted).
Gallery draws every section as a 3-column grid (`cardGrid.tsx`, width
measured with `onLayout`) of `CardArt` `tile`s — today a card-shaped
placeholder that names the card — with a "×n" badge bottom-right and the
chosen champion first, tagged "CC", as on Piltover Archive. Show changes
works in both layouts (gallery: tinted badge + label, cut cards faded).

**Version history.** The deck screen loads every version with the deck
(`fetchDeckVersions`, oldest first, so "Version 1" is always the first
import). Once there's more than one, a "Versions" expander card at the bottom
(`components/deck/deckVersions.tsx`) lists them newest first — number, date,
"Current" tag, nothing else. Tapping an earlier one opens the same read-only
`?version=` view a match link uses ("Version 1 of 2"); from there "See current
list" just goes back. Renames never create versions — the name lives on the
deck — so the history survives any rename.

**Show changes** (`components/deck/changesToggle.tsx`) sits at the BOTTOM of
the decklist, above "Versions", so the list itself stays clean; it appears on
any version but the first. Turned on, it marks inside the list what changed
since an earlier version — by default **the version just before the one on
screen** (for the current deck: your last edit), never the current list.
"Compared with" lets you pick any earlier version instead (only earlier ones,
so green always means "added since then"). `DeckView` takes
`changes = diffDeckLists(chosen earlier, shown)`: changed rows become an
inset rounded pill tinted `added` (green) or `cut` (red) — inset so they never
meet the section card's rounded edges — plus "+n" / "−n" / "New"; cards
cut since then are appended struck through with "Removed"; runes switch from
the bar to rows so their changes show; a replaced legend gets "New". Matching
is by `deckCardKey` (core). Color is never the only signal.

**Default deck** (Profile): the same `DeckPicker`, saved
with `setDefaultDeck()` (`lib/profile.ts`, a plain update of
`profiles.default_deck_id`) and tagged "Default" on its row. The setup sheet
pre-selects it (`preselect`) unless you've already picked. Deleting that deck
clears it server-side, so Profile refreshes after a delete.

**Search and sort (the Decks tab)**, once there's more than one deck: a search
field (deck name or legend, like the picker) with a sort dropdown beside it —
"Recently updated" (default) or "Recently created", built like the picker's
Legend menu. Rows show the date the list is sorted by (`DeckRow`'s `date`
prop). A search change clears the selection.

**Feedback** (`lib/feedback.ts`, schema in `../../supabase/CLAUDE.md`).
"Send feedback" on Profile opens `components/feedbackSheet.tsx` — headline +
text, anonymous, rate-limited server-side (the sheet shows `rate_limited`).
Feedback admins also get "View feedback" with an unread badge
(`feedback_unread_count()` is null for everyone else, which hides the row) →
`app/feedback.tsx`: All / Unread / Read chips with counts, search, tap to open
(marks read, "Mark as unread" to flip back), swipe to delete, and
multi-select with mark read / unread / delete. Changes are optimistic and
re-read on failure.

**Multi-select (History and Decks).** WhatsApp-style: a "Select" button
in the list header, or long-press a row (which selects it). While selecting,
a tap toggles a row (a check circle *outside* the card, to its left, plus an
accent outline), swipe-to-delete and
opening the detail are off, and the header becomes `components/selectionBar.tsx`
(Cancel · "N selected" · actions). State is `hooks/useSelection.ts`; actions
are a data array, so a future "Move to folder" is one more entry. Today the
only action is the trash can → `deleteMatches(ids)` (hard, cascade) or
`deleteDecks(ids)` (soft), both optimistic with restore-on-failure. Selection
exits on blur, after an action, or on Cancel; a History filter change clears
the selection so hidden rows are never deleted. Keep each row's `onLongPress`
set even while selecting: if it disappears mid-press (the long-press is what
enters selection mode), the release counts as a tap and deselects the row. Name rules live in `DECK_NAME_MAX` / `isValidDeckName`. Parsing is local and pure
(`parseDeckText` in `@riftlog/core`); the import screen shows each diagnostic
inside its section and blocks saving only on errors, never on count warnings.
Deck codes are recognised by shape (`looksLikeDeckCode`) and decoded with
`decodeDeckCode` + `deckListFromCode` (see "Editing a list" above).

**History rows** (`lib/historyView.ts` → `components/historyRow.tsx`). The
view-model is the single place row display is decided; keep the components dumb.
Rules that are easy to get wrong:

- **Never render a bare player name.** `p1` is you, so the row labels the other
  side — `vs {opponent}` — and the match detail names both, you first, in
  score order (`you – opponent`).
- **Absent is not zero.** Rows written before a column existed read back as
  `undefined`, so optional fields use loose `== null` checks. A strict `=== null`
  on `time_limit_seconds` is what once rendered a `NaN:NaN` clock on every row.
- **The clock chip is for timed matches only.** `vm.timer` is `null` for an
  untimed match and the icon + limit are inside that guard — an untimed row
  shows just `BO1`/`BO3`.
- **Legacy placeholder names are normalized.** Matches started with blank name
  fields stored the literal `"Player 1"` / `"Player 2"`; those render as
  `You` / `Opponent` rather than being shown as if they were real names.
- **Home** (`app/(tabs)/index.tsx`), top to bottom: the brand; the
  **hero** (`components/home/heroCard.tsx`) — "Start a match" on your
  **default deck's** legend art (`CardBackdrop`), the deck named in the
  corner with **Change** beside it (a `DeckPicker` with `renderTrigger`, so
  the hero opens the same deck sheet; choosing sets the default). Without a
  default it says "None chosen" + Choose, with no decks "No decks yet" +
  Import, a guest "Ready to play" — the same card without art. Then **Your
  matches**: **Last 10** (`components/home/lastTenStrip.tsx`: your last ten
  results as W/L/D tiles, **newest on the left** — read left to right like
  the match list, no "newest first" label needed — each opening its match,
  plus the record of those ten, e.g. "6–4"; all-time stats wait for the
  stats section) and then **as many match lines as fit** — **one container,
  two parts**: Last 10 on top (`bare`), the matches below it in their own
  inset panel (`bg-background`, rounded, inside the `bg-surface` card).
  Each line (`components/home/matchLine.tsx`, 52pt): result bar + letter,
  the face of the legend **you** played (as History shows it — the
  opponent's face was tried and made no sense to the owner), "vs" name,
  format · deck, score in the result color, date. **No backdrop art**: art
  rows repeated your legend and looked busy. The section is `flex-1` and
  measures itself (heading + strip + `CARD_CHROME`, then `floor` of whole
  lines, **at most four** (`MAX_LINES`) — Last 10 covers more, History the
  rest); the leftover is shared above and below it (`justify-center`), so
  it reads as
  even spacing, never a gap at the bottom. With
  "See all"; then **Your decks**
  (`components/home/deckStrip.tsx`): a sideways row of deck tiles — legend
  face, name, your record with that deck (own matches only), "Default"
  tag — most recently played first, up to eight, ending in an Import tile;
  "See all" opens Decks. So Home reads: play → how it's going → what you
  play with. **Home fills exactly one screen**: no scrolling on a 6.1"
  iPhone (852pt) and no empty space at the bottom — the slack goes to
  *content* (more match lines, the rest as even section spacing), never to
  stretching a card. Home ends 24pt above the tab bar, so the deck row
  doesn't read as part of the bar (a hero that grew
  to fill the space was rejected outright). Hero 176pt, deck art 72pt,
  tight section spacing; the ScrollView's content has `flexGrow: 1`.
  Smaller phones may scroll
  a little, so a shade sits behind the status bar. No
  profile button: Profile is a tab. (A flat purple CTA, a separate deck
  field and a three-number stats box were merged into the hero and the
  strip. A fixed two rows looked too little and three made Home scroll —
  hence lines that fit. A "last match" versus card and art rows inside the
  card were tried and dropped. "Form" was renamed:
  it read as misleading.)
- **The default deck can be set in three places**: Home's hero (Change),
  the deck screen's top bar (**Make default** / **Default** pill beside
  Edit list, `components/deck/defaultDeckToggle.tsx`; tap again to remove;
  not on an earlier version), and Profile. All write
  `profiles.default_deck_id`. It was hard to find with Profile and a plain
  field on Home only.
- **History's filters** (`lib/historyFilter.ts`,
  `components/history/filterSheet.tsx`): under the title, a **search**
  (opponent, deck or legend, yours or theirs) and a **Filter** button with
  a badge for how many filters are on. It opens a sheet from the bottom:
  Result (All / Wins / Losses / Draws), Format, Played (any time / 7 / 30 /
  90 days), then **Your deck**, **Your legend** and **Their legend** — only
  ones that appear in your matches, legends as pills with their face.
  Changes apply at once; the button says "Show N matches" and just closes.
  Active filters show under the search as removable chips (plus "Clear
  all"), and the count reads "12 of 51". Legends match by normalized card
  name, so printings of one legend count once. Filter state is per visit.
  (Day headings were tried and dropped.) The floating header measures its
  height (chips come and go) and the list starts below it.
- **Tapping a match row — History or Home — opens the match detail**
  (`/matches/[id]`). There is no inline expansion: it was tried in several
  forms and read as clutter that duplicated the detail screen, and animating
  a row's height inside the list was the main source of History's lag.

## Auth & guest mode

`contexts/authContext.tsx` is the only place session state lives. It exposes
`session` / `user` / `status` / `signOut`, and is mounted **above**
`MatchProvider` in `app/_layout.tsx` so `MatchSync` can read both.

- **`status` is `'loading' | 'authed' | 'guest'`, derived, never stored** —
  same rule as `phase`. `'loading'` is a real third state, not a synonym for
  guest: treating it as guest flashes the login gate over every account tab on
  every cold start.
- **There is no anonymous sign-in.** It was removed. A signed-out user gets a
  guest sandbox; see the write rules below.
- The `AppState` → `startAutoRefresh`/`stopAutoRefresh` pair is registered at
  module scope (process-wide, not per-mount).

### Guest mode — the write rules (don't soften these)

`components/matchSync.tsx` enforces them. A guest's match is **in-memory only**:
no Postgres row, no in-progress mirror, no outbox entry. On sign-in the guest
match is **discarded** (`endMatch()`), never uploaded or merged.

Two traps live here, both already handled — don't undo them:

1. **`guestMatchIds`.** Sign-in flips `status` and re-runs the write effect in
   the *same commit*, while the discard is a `setState` that hasn't landed yet.
   Gating writes on the current status alone therefore uploads the guest's
   match into the account that just signed in. Matches seen while signed out
   are tracked **by id** and stay untouchable regardless of later auth state.
2. **`clearOutbox()` on sign-out** (`lib/localStore.ts`, called from
   `signOut()`). Outbox entries carry **no `user_id`** — `matches.user_id`
   defaults from `auth.uid()` at insert time — so a match queued by account A
   and flushed while account B is signed in is written to **B**. The queue is
   only ever valid for the session that filled it.

### Profile & onboarding

`contexts/profileContext.tsx` holds the signed-in user's `profiles` row, read
from Postgres per user (keyed on user id, so token refreshes don't refetch) and
**never cached on-device**. It exposes `profile`, `profileStatus`
(`idle | loading | ready | error`), derived `needsOnboarding`, and `refresh()`.

**The onboarding gate is a `Stack.Protected` guard in `app/_layout.tsx`, not a
redirect effect.** While `needsOnboarding` holds (`ready` and `onboarded_at`
null, or no row at all), the tabs/login routes don't exist and `onboarding` is
the only screen. Rules that keep it correct:

- **Resumable by construction.** Nothing on the device records "mid-onboarding";
  the gate is re-derived from `onboarded_at` on every launch. Don't add a local
  flag for it.
- **An `error` read does not gate.** The live tracker must work offline, so an
  offline launch opens the app normally and retries on reconnect / foreground.
- **While the first read is `loading`,** a blank `bg-background` overlay covers
  the app (overlay, not swapping out `<Stack>`, so the navigator stays mounted)
  — otherwise the tabs flash and are then yanked away.
- **Continue is one RPC.** `completeOnboarding()` (`lib/profile.ts`) calls
  `complete_onboarding`, which claims the handle, sets the name, and stamps
  `onboarded_at` atomically; then `refresh()` flips the guard. It's idempotent,
  so a failed refresh is fixed by pressing Continue again.
- **Handles can't be written with a plain update** (column grants), only via
  the RPCs — see `../../supabase/CLAUDE.md`. `display_name` can.
- The handle field checks format locally (`HANDLE_PATTERN` in `@riftlog/core`
  mirrors the DB CHECK — keep them in lockstep), then asks
  `is_username_available` after a 300ms debounce, guarding against stale
  responses. Suggestions come from `handleSuggestionSource` — provider names
  only, **never the email**.
- There is **no deck step**: deck import doesn't exist yet. When it does, an
  optional, skippable step goes *after* `onboarded_at` is set, so it can never
  hold the gate.

### Gating

`components/authGate.tsx` wraps History and Profile. Signed out it renders the
tab's real content inert (`pointerEvents="none"`) under a `BlurView` and a login
card. **In-place overlay, never a redirect** — and both gated screens skip their
own fetch while signed out, or they'd paint an RLS error behind the blur. Home is
guest-usable and shows `components/guestBanner.tsx` throughout.

`BlurView` takes a **style object, not a className** — NativeWind doesn't map
classes onto third-party native components without `cssInterop`.

### Providers

`lib/auth.ts`, one function per method, each recording `setLastAuthMethod` on
success. Cancellation returns `'cancelled'` rather than throwing, so a dismissed
sheet doesn't paint a red error.

- **Discord** — browser flow: `signInWithOAuth({ skipBrowserRedirect: true })` →
  `WebBrowser.openAuthSessionAsync` → `getQueryParams` → `setSession`. Tokens
  come back in the URL **fragment**, which `Linking.parse` can't read — hence
  `expo-auth-session/build/QueryParams`.

**The redirect URI is a hard-coded constant, `AUTH_REDIRECT_URI`
(`riftlog://auth-callback`) — do not "improve" it back into `makeRedirectUri()`.**
Called with no arguments, `makeRedirectUri()` only yields a bare `riftlog://`
when expo-linking considers the app Expo-hosted; otherwise it bakes the Metro
host in (`riftlog://192.168.0.34:8081`), so the value moves with the dev
machine's network and can't be allow-listed. One fixed value, allow-listed once,
identical in dev and production.

**Failure mode to know, because it is silent.** If that URI isn't in Supabase →
Authentication → URL Configuration → Redirect URLs, Supabase does **not** return
an error — it redirects to **Site URL** instead. The browser lands on a page that
isn't there, no deep link ever fires, and from the app's side that is
indistinguishable from the user cancelling. Hence the `__DEV__` warning on the
non-success branch in `signInWithDiscord`: if a sign-in "cancels" itself, read
the Metro logs. Site URL is set to the same app URL so a future misconfiguration
at least bounces back into Riftlog.

**On Android the router must ignore the redirect — `app/+native-intent.tsx`.**
iOS's auth session swallows `riftlog://auth-callback`; Android's browser hands
it to the app as an ordinary deep link, so Expo Router sees it too. Without
`redirectSystemPath` dropping it (`''` = don't navigate; `/` when it's the
launch URL), the router finds no `/auth-callback` route and replaces the whole
root layout — providers included — with "Unmatched Route": the sign-in
succeeds, but `SIGNED_IN` lands on unmounted listeners behind a dead screen.
Don't add an `auth-callback` screen instead; the tokens are read off
`openAuthSessionAsync`'s result, not by a route.
- **Google — the same handler as Discord.** `signInWithRedirectProvider` takes
  the provider as an argument; `signInWithDiscord` / `signInWithGoogle` are thin
  wrappers over it. One browser flow, one redirect URI, two callers. Google
  needs **no** client id in the app, **no** `EXPO_PUBLIC_GOOGLE_*` var, and
  **no** config plugin — Supabase holds the credentials. Native Google
  (`@react-native-google-signin`) was evaluated and removed: it bought nothing
  over the redirect and cost a client id, a reversed-client-id URL scheme, and
  a plugin. Don't reintroduce it.
- **Apple — the one native flow**, because iOS offers no browser path for it.
  `signInAsync` → `identityToken` → `signInWithIdToken`. Enabled by the
  `expo-apple-authentication` plugin **plus** `ios.usesAppleSignIn` in
  `app.json`, which together provision the `com.apple.developer.applesignin`
  entitlement at prebuild. Never hand-edit `ios/` for this — `ios/` is
  gitignored and regenerated. Required by App Store Guideline 4.8 once other
  third-party sign-in is offered.
- Apple's `fullName` arrives only on the first authorization and never in the
  token, so `signInWithApple` backfills it via `updateUser`. That call is
  intentionally non-fatal: the user is already signed in, and a cosmetic name
  is not worth failing a sign-in over.
- **Email** — `signInWithOtp({ shouldCreateUser: true })` → 6-digit
  `verifyOtp`. `shouldCreateUser` is what makes sign-in and sign-up one action.
  **No passwords anywhere in this app.**

**Apple sign-in is a native module, so it does not work in Expo Go** — `pnpm
mobile start --go` is not enough for auth work; use a dev client. Discord and
Google, being browser redirects, do work there.

`lib/authPrefs.ts` holds the "Last used" badge — device-local, non-sensitive,
readable while signed out, and deliberately **not** in `lib/localStore.ts` so
that file's "exactly two match keys" contract stays true.

## What not to build proactively

The user is building incrementally. Don't add the following until its slice
is explicitly started:

- The track-turns control in pre-match setup (format, names, timed mode,
  and deck are built)
- The match detail's opponent block (their deck, linked profile,
  head-to-head, win rate) — needs match mode
- Riftmana import, restoring an old version as current, and restoring deleted
  decks. Text and deck-code import (a code is sorted by catalog types; unknown
  printings go to an "Unsorted" section that re-sorts on screen once the
  catalog knows them), "Copy deck code", the deck view, renaming, editing the
  list (new version), (soft) delete, the Decks tab, and choosing a deck for a
  match are built.
- The designed history UI / detail view (only a minimal read-only list exists)
- Profile **editing** — the handle rename UI and stats. `claim_username`
  already enforces the rules (30-day limit); nothing calls it from the client
  yet. The only setting on Profile is the default deck.
- **Profile pictures of any kind** — not deferred, ruled out. One default
  avatar for everyone.
- Any manual account-linking UI

Match **history is never mirrored locally** — read from Postgres on demand — so
don't build a growing on-device history store. Local persistence is bounded to:
the encrypted auth **session** (LargeSecureStore), the **offline match state**
(in-progress match + outbox, `lib/localStore.ts`), the one non-sensitive
"last used sign-in method" key (`lib/authPrefs.ts`), and the **card catalog
cache** (`lib/catalog.ts` — public reference data, one file, replaced
wholesale when the catalog version moves). Don't add more.

Also: don't add local persistence for **guest** matches. It looks like a
kindness and it isn't — anything durable a guest produces has to be either
migrated at login (merge logic, which this design exists to avoid) or thrown
away later anyway, more confusingly.

These are specced in `SPEC.md` and sequenced — build them when their roadmap
step begins, not ahead of it.

## Design handoffs

Screens come from Claude Design as web structure (HTML/CSS). Always

implement them in React Native (View/Text/NativeWind) against the

existing components and tokens — never paste web markup, never introduce

inline hex. Map every design color to a token in tailwind.config.js; if a

needed color has no token, add one rather than hardcoding it.
