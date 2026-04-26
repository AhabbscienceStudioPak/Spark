export const colors = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3F9',
  text: '#102A43',
  textMuted: '#627D98',
  primary: '#2D6A4F',
  primarySoft: '#E7F5EE',
  accent: '#E76F51',
  warningSoft: '#FFF4DD',
  warningText: '#9A6700',
  border: '#D9E2EC',
  dangerSoft: '#FFE9E7',
  danger: '#D64545',
  successSoft: '#E6F6ED',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: 28,
  h2: 22,
  body: 15,
  caption: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;
