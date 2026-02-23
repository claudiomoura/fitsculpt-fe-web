export const duration = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  slower: 500,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1.2)',
} as const;


export const interaction = {
  hoverLiftSubtle: 1,
  focusRingWidth: 3,
} as const;
