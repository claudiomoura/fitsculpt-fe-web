import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

const minColumnWidthClasses = {
  sm: 'sm:grid-cols-2 lg:grid-cols-3',
  md: 'sm:grid-cols-2 xl:grid-cols-3',
  lg: 'md:grid-cols-2',
} as const;

type CardGridDensity = keyof typeof minColumnWidthClasses;

export type CardGridProps = HTMLAttributes<HTMLDivElement> & {
  density?: CardGridDensity;
};

export function CardGrid({ density = 'md', className, ...props }: CardGridProps) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 md:gap-6', minColumnWidthClasses[density], className)}
      {...props}
    />
  );
}
