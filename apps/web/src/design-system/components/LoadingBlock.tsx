import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

import { PageContainer } from './PageContainer';
import { Stack } from './Stack';

export type LoadingBlockProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  centered?: boolean;
};

export function LoadingBlock({
  title = 'Loading',
  description,
  centered = true,
  className,
  ...props
}: LoadingBlockProps) {
  return (
    <PageContainer
      as="section"
      className={cn(centered ? 'py-16 md:py-20' : 'py-8 md:py-12', className)}
      {...props}
    >
      <Stack align="center" gap="4" className="text-center" role="status" aria-live="polite">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-[var(--color-border-default)] border-t-[var(--color-primary)]"
        />
        <Stack align="center" gap="2" className="max-w-lg">
          <p className="m-0 text-base font-semibold text-text">{title}</p>
          {description ? <p className="m-0 text-sm text-text-muted">{description}</p> : null}
        </Stack>
      </Stack>
    </PageContainer>
  );
}
