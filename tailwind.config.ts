import type { Config } from 'tailwindcss';

// "Midnight Violet" palette (chosen from the crossout-palettes options artifact) —
// dark, focused workspace with a cool violet accent, amber for the
// emergency-pass/excused state, and a muted red for missed days. Status colors
// (amber/red) are semantic and stay fixed across any future accent changes.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0a14',
        surface: '#14121f',
        'surface-raised': '#1c1930',
        'surface-sunken': '#0e0c18',
        border: '#2a2745',
        'border-soft': '#1e1b33',
        ink: '#ece9f7',
        'ink-muted': '#a29bc2',
        'ink-faint': '#655f85',
        accent: '#8b7bf0',
        'accent-ink': '#0c0a1c',
        amber: '#e3ab5f',
        red: '#d68372',
      },
      fontFamily: {
        mono: ['SFMono-Regular', 'JetBrains Mono', 'Consolas', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
