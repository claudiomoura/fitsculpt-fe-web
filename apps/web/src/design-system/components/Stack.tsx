import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

import { type SpacingScaleValue, resolveSpacingToken } from '../layout';

const spacingToClass = {
  8: '8',
  16: '16',
  24: '24',
  32: '32',
  48: '48',
} as const;

type Direction = 'vertical' | 'horizontal';
type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: SpacingScaleValue;
  direction?: Direction;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
};

const directionClasses: Record<Direction, string> = {
  vertical: 'flex-col',
  horizontal: 'flex-row',
};

const alignClasses: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyClasses: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export function Stack({
  gap = '24',
  direction = 'vertical',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  ...props
}: StackProps) {
  const gapToken = resolveSpacingToken(gap);

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrap ? 'flex-wrap' : 'flex-nowrap',
        `gap-${spacingToClass[gapToken]}`,
        className,
      )}
      {...props}
    />
  );
}
