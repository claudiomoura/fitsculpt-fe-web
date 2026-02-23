export const duration = {
  instant: 0,
  fast: 120,
  hover: 150,
  normal: 200,
  slow: 320,
  slower: 500,
} as const;

export const easing = {
  ease: 'ease',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1.2)',
} as const;

export const transition = {
  color: {
    duration: duration.hover,
    easing: easing.standard,
    properties: ['color', 'background-color', 'border-color', 'fill', 'stroke'],
  },
  surface: {
    duration: duration.normal,
    easing: easing.standard,
    properties: ['background-color', 'border-color', 'box-shadow'],
  },
  transform: {
    duration: duration.hover,
    easing: easing.standard,
    properties: ['transform'],
  },
  emphasis: {
    duration: duration.normal,
    easing: easing.emphasized,
    properties: ['transform', 'opacity'],
  },

  interactive: {
    duration: duration.hover,
    easing: easing.ease,
    properties: ['transform', 'background-color', 'color', 'box-shadow'],
  },
} as const;

export type TransitionToken = keyof typeof transition;

export const toMs = (value: number) => `${value}ms`;

export const createTransition = (
  token: TransitionToken,
  properties = transition[token].properties,
) => properties.map((property) => `${property} ${toMs(transition[token].duration)} ${transition[token].easing}`).join(', ');

export const interaction = {
  hoverLiftSubtle: 1,
  focusRingWidth: 3,
} as const;
