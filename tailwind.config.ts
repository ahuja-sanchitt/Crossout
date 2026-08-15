import type { Config } from 'tailwindcss';

// Tokens lifted straight from the approved mockup (crossout-ui artifact) —
// dark, focused workspace with a single teal accent, amber for the
// emergency-pass/excused state, and a muted red for missed days.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0f0d',
        surface: '#121815',
        'surface-raised': '#171f1b',
        'surface-sunken': '#0e1411',
        border: '#232f29',
        'border-soft': '#1a2420',
        ink: '#e7ede9',
        'ink-muted': '#93a39a',
        'ink-faint': '#5f6f66',
        accent: '#4fbf9f',
        'accent-ink': '#06170f',
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
