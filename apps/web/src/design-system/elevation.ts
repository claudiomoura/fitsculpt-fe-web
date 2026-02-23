export const elevation = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.08)',
  md: '0 6px 12px -3px rgb(15 23 42 / 0.12)',
  lg: '0 12px 22px -6px rgb(15 23 42 / 0.16)',
  xl: '0 20px 34px -10px rgb(15 23 42 / 0.2)',
} as const;

export const professionalElevation = {
  ...elevation,
  sm: '0 2px 4px 0 rgb(15 23 42 / 0.1)',
  md: '0 8px 16px -4px rgb(15 23 42 / 0.14)',
  lg: '0 14px 26px -7px rgb(15 23 42 / 0.18)',
  xl: '0 24px 40px -12px rgb(15 23 42 / 0.24)',
} as const;

export const elevationVariants = {
  default: elevation,
  professional: professionalElevation,
} as const;

export type ElevationVariant = keyof typeof elevationVariants;

export const getElevation = (variant: ElevationVariant = 'default') => elevationVariants[variant];
