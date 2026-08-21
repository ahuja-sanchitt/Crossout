// Same tokens as the web app's tailwind.config.ts — kept in sync by hand since
// there's no shared config between the two projects.
export const colors = {
  bg: '#0b0f0d',
  surface: '#121815',
  surfaceRaised: '#171f1b',
  surfaceSunken: '#0e1411',
  border: '#232f29',
  borderSoft: '#1a2420',
  ink: '#e7ede9',
  inkMuted: '#93a39a',
  inkFaint: '#5f6f66',
  accent: '#4fbf9f',
  accentInk: '#06170f',
  amber: '#e3ab5f',
  red: '#d68372',
};

export const priorityDot = {
  high: colors.red,
  med: colors.amber,
  low: colors.inkFaint,
};
