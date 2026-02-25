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
  bgPrimary: '#0B0E13',
  bgCard: '#141822',
  borderSubtle: '#232A3A',
  accentPrimary: '#00F5C3',
  accentSecondary: '#3B82F6',
  textPrimary: '#E6EAF2',
  textSecondary: '#9AA3B2',
  background: '#0B0E13',
  surface: '#141822',
  surfaceMuted: colorPalette.slate100,
  surfaceInverse: colorPalette.slate900,
  textMuted: colorPalette.slate500,
  textInverse: colorPalette.white,
  borderDefault: '#232A3A',
  borderStrong: colorPalette.slate300,
  primary: '#00F5C3',
  primaryHover: colorPalette.blue700,
  primarySoft: '#3B82F6',
  secondary: '#3B82F6',
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
  bgPrimary: '#F6F4F1',
  bgCard: '#FFFFFF',
  borderSubtle: '#E2E8F0',
  accentPrimary: '#00D084',
  accentSecondary: '#3B82F6',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  background: '#F6F4F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  borderDefault: '#E2E8F0',
  borderStrong: '#CBD5E1',
  primary: '#00D084',
  primaryHover: '#00B874',
  primarySoft: '#3B82F6',
  secondary: '#3B82F6',
  focusRing: colorPalette.blue500,
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

export const semanticGradients = {
  headerSubtle:
    'linear-gradient(125deg, color-mix(in srgb, var(--color-primary) 9%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 6%, transparent) 52%, transparent 100%)',
  surfaceSubtle:
    'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 6%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 4%, transparent) 100%)',
} as const;

export type SemanticGradientToken = keyof typeof semanticGradients;
