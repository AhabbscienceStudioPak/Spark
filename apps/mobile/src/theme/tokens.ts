import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const colors = {
  bg: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3F9',
  text: '#0D2137',
  textMuted: '#5A7A94',
  primary: '#1B7A4E',
  primarySoft: '#E3F5EC',
  accent: '#E76F51',
  accentSoft: '#FEF0EB',
  warningSoft: '#FFF4DD',
  warningText: '#9A6700',
  border: '#DDE6EF',
  dangerSoft: '#FFE9E7',
  danger: '#C0392B',
  successSoft: '#E6F6ED',
  cardGradientStart: '#FFFFFF',
  cardGradientEnd: '#F7FAFC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  title: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  caption: 11,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const screen = {
  width: SCREEN_WIDTH,
  cardWidth: SCREEN_WIDTH - spacing.md * 2,
} as const;
