import { spacing, type SpacingToken } from './spacing';

export const containerWidth = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

export const grid = {
  gutter: spacing[16],
  sectionGap: spacing[32],
  contentGap: spacing[24],
} as const;

export const spacingAliases = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

type LegacySpacingToken = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24' | '32';

const legacySpacingAliases: Record<LegacySpacingToken, SpacingToken> = {
  0: 8,
  1: 8,
  2: 16,
  3: 24,
  4: 24,
  5: 32,
  6: 32,
  8: 48,
  10: 48,
  12: 48,
  16: 48,
  20: 48,
  24: 48,
  32: 48,
};

export type SpacingScaleValue = SpacingToken | `${SpacingToken}` | keyof typeof spacingAliases | LegacySpacingToken;

export function resolveSpacingToken(value: SpacingScaleValue): SpacingToken {
  if (value in spacingAliases) {
    return spacingAliases[value as keyof typeof spacingAliases];
  }

  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && numericValue in spacing) {
    return numericValue as SpacingToken;
  }

  if (value in legacySpacingAliases) {
    return legacySpacingAliases[value as LegacySpacingToken];
  }

  throw new Error(`Invalid spacing token: ${String(value)}`);
}
