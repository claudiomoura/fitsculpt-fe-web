export const densityScale = {
  compact: 0.9,
  comfortable: 1,
  relaxed: 1.1,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 14,
  4: 18,
  5: 22,
  6: 26,
  8: 34,
  10: 42,
  12: 50,
  16: 66,
  20: 82,
  24: 98,
  32: 130,
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
