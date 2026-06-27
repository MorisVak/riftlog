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
        border: '#2E3C56',

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
      },
    },
  },
  plugins: [],
};
