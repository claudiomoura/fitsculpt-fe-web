export const densityScale = {
  compact: 0.9,
  comfortable: 1,
  relaxed: 1.1,
} as const;

export const spacing = {
  8: 8,
  16: 16,
  24: 24,
  32: 32,
  48: 48,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export type DensityToken = keyof typeof densityScale;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
