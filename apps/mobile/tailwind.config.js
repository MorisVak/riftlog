/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Design typefaces (loaded in app/_layout.tsx via @expo-google-fonts).
      // `font-display` → Space Grotesk for UI/headings; `font-mono` → IBM Plex
      // Mono for numerals (scores). Use the SemiBold faces by default and the
      // Medium/Bold faces via the explicit family classes below.
      fontFamily: {
        display: ['SpaceGrotesk_600SemiBold'],
        'display-bold': ['SpaceGrotesk_700Bold'],
        'display-medium': ['SpaceGrotesk_500Medium'],
        mono: ['IBMPlexMono_600SemiBold'],
        'mono-medium': ['IBMPlexMono_500Medium'],
      },
      colors: {
        // Base & surface (darkest → lightest)
        background: '#0D1B2A',
        surface: '#18223A',
        elevated: '#222D47',
        // Brightened from the original #2E3C56: at that value a hairline on
        // `surface` was nearly invisible, so cards and dividers had no edge.
        // Same hue, ~35% lighter — still a step below `ink-tertiary`, which is
        // text and stays the brighter of the two.
        border: '#3E506E',

        // Accent — periwinkle (single brand accent)
        // Translucent accent fills: use opacity, e.g. bg-accent/15
        accent: {
          DEFAULT: '#8B93D9',
          strong: '#6D74C4',
          soft: '#A6ADE6',
          deep: '#14182B',
        },

        // Text ramp (named `ink` to avoid `text-text-*` class collisions)
        ink: {
          primary: '#E4E5F2',
          secondary: '#868FB0',
          tertiary: '#5E6788',
        },

        // Result states. Per result: base / text / tint / deep
        //   base  → colored left bar, badge fill, solid indicator
        //   text  → result text on a dark background
        //   tint  → muted row/cell highlight on surface
        //   deep  → faint full-bleed background wash
        // Result color is NEVER the only signal — always pair with a
        // W/L/D letter badge and a colored left bar.
        win: {
          DEFAULT: '#22C55E',
          text: '#4ADE80',
          tint: '#385041',
          deep: '#052E13',
        },
        loss: {
          DEFAULT: '#EF4444',
          text: '#FB8181',
          tint: '#573D3D',
          deep: '#2A0606',
        },
        draw: {
          DEFAULT: '#C6A864',
          text: '#D8C290',
          tint: '#524D42',
          deep: '#2B2102',
        },

        // Scoring actions on the play board — HOW a point was taken (conquer a
        // battlefield / hold it / a special). Deliberately their own family:
        // these describe an action, while win/loss/draw describe a result, and
        // the two must stay separable. `tint` is the dark button fill.
        conquer: {
          DEFAULT: '#34D399',
          tint: '#15352A',
        },
        hold: {
          DEFAULT: '#E0B94A',
          tint: '#3A3018',
        },
        special: {
          DEFAULT: '#E879C7',
          tint: '#3A1B31',
        },
      },

      // Periwinkle accent glow under the major accent buttons (design CTAs).
      // The accent rgba lives here in the design-system source, mirroring the
      // `accent` color token. `card` is the larger glow for the home Start
      // card; `btn` is the lighter glow for pill CTAs (setup start, board END,
      // between-games continue, match-complete done).
      boxShadow: {
        'accent-card': '0px 8px 28px 2px rgba(139, 147, 217, 0.6)',
        'accent-btn': '0px 3px 10px 0px rgba(139, 147, 217, 0.28)',
      },
    },
  },
  plugins: [],
};
