import { spacing } from './spacing';

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
  gutter: spacing[4],
  sectionGap: spacing[12],
  contentGap: spacing[6],
} as const;
