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

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

type ResponsivePadding = {
  base?: SpacingScaleValue;
  md?: SpacingScaleValue;
  lg?: SpacingScaleValue;
};

export type PageContainerProps = HTMLAttributes<HTMLElement> & {
  as?: 'main' | 'div' | 'section';
  maxWidth?: MaxWidth;
  padding?: SpacingScaleValue | ResponsivePadding;
  surface?: 'none' | 'subtle';
};

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

function toPaddingClass(prefix: 'px' | 'md:px' | 'lg:px', value: SpacingScaleValue) {
  const spacingToken = resolveSpacingToken(value);
  return `${prefix}-${spacingToClass[spacingToken]}`;
}

function getPaddingClasses(padding: PageContainerProps['padding']) {
  if (padding == null) {
    return [
      toPaddingClass('px', '8'),
      toPaddingClass('md:px', '16'),
      toPaddingClass('lg:px', '24'),
    ];
  }

  if (typeof padding === 'object') {
    return [
      toPaddingClass('px', padding.base ?? '8'),
      toPaddingClass('md:px', padding.md ?? padding.base ?? '16'),
      toPaddingClass('lg:px', padding.lg ?? padding.md ?? padding.base ?? '24'),
    ];
  }

  return [toPaddingClass('px', padding)];
}

export function PageContainer({
  as: Component = 'main',
  maxWidth = 'xl',
  padding,
  surface = 'none',
  className,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        ...getPaddingClasses(padding),
        surface === 'subtle' ? 'rounded-lg bg-[var(--color-surface-muted)]' : undefined,
        className,
      )}
      {...props}
    />
  );
}
