// "Midnight Violet" palette — same tokens as the web app's tailwind.config.ts,
// kept in sync by hand since there's no shared config between the two projects.
export const colors = {
  bg: '#0b0a14',
  surface: '#14121f',
  surfaceRaised: '#1c1930',
  surfaceSunken: '#0e0c18',
  border: '#2a2745',
  borderSoft: '#1e1b33',
  ink: '#ece9f7',
  inkMuted: '#a29bc2',
  inkFaint: '#655f85',
  accent: '#8b7bf0',
  accentInk: '#0c0a1c',
  amber: '#e3ab5f',
  red: '#d68372',
};

export const priorityDot = {
  high: colors.red,
  med: colors.amber,
  low: colors.inkFaint,
};
