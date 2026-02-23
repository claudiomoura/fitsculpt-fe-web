import { transition } from './motion';

export const colorPalette = {
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  emerald500: '#10B981',
  emerald600: '#059669',
  amber500: '#F59E0B',
  amber600: '#D97706',
  red500: '#EF4444',
  red600: '#DC2626',
} as const;

export const semanticColors = {
  background: colorPalette.slate50,
  surface: colorPalette.white,
  surfaceMuted: colorPalette.slate100,
  surfaceInverse: colorPalette.slate900,
  textPrimary: colorPalette.slate900,
  textSecondary: colorPalette.slate600,
  textMuted: colorPalette.slate500,
  textInverse: colorPalette.white,
  borderDefault: colorPalette.slate200,
  borderStrong: colorPalette.slate300,
  primary: colorPalette.blue600,
  primaryHover: colorPalette.blue700,
  primarySoft: colorPalette.blue500,
  success: colorPalette.emerald600,
  successSoft: colorPalette.emerald500,
  warning: colorPalette.amber600,
  warningSoft: colorPalette.amber500,
  danger: colorPalette.red600,
  dangerSoft: colorPalette.red500,
  focusRing: colorPalette.blue500,
} as const;

export const professionalSemanticColors = {
  ...semanticColors,
  background: colorPalette.slate100,
  surface: colorPalette.slate50,
  surfaceMuted: colorPalette.white,
  textPrimary: colorPalette.slate800,
  textSecondary: colorPalette.slate700,
  borderDefault: colorPalette.slate300,
  borderStrong: colorPalette.slate400,
  primary: colorPalette.slate700,
  primaryHover: colorPalette.slate800,
  primarySoft: colorPalette.slate600,
  focusRing: colorPalette.slate500,
} as const;

export const semanticColorVariants = {
  default: semanticColors,
  professional: professionalSemanticColors,
} as const;

export type SemanticColorVariant = keyof typeof semanticColorVariants;

export const getSemanticColors = (variant: SemanticColorVariant = 'default') => semanticColorVariants[variant];

export type ColorPaletteToken = keyof typeof colorPalette;
export type SemanticColorToken = keyof typeof semanticColors;

export const semanticTransitions = {
  hover: transition.color,
  interactiveSurface: transition.surface,
  interactiveTransform: transition.transform,
} as const;

export type SemanticTransitionToken = keyof typeof semanticTransitions;
