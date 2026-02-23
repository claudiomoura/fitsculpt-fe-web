import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { PageContainer } from './PageContainer';
import { Stack } from './Stack';

export type EmptyBlockProps = HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  centered?: boolean;
};

export function EmptyBlock({
  title,
  description,
  icon,
  action,
  centered = true,
  className,
  children,
  ...props
}: EmptyBlockProps) {
  return (
    <PageContainer
      as="section"
      className={cn(centered ? 'py-16 md:py-20' : 'py-8 md:py-12', className)}
      {...props}
    >
      <Stack align="center" gap="4" className="text-center">
        {icon ? (
          <div className="rounded-full bg-[var(--color-surface-muted)] p-3 text-[var(--color-text-secondary)]">{icon}</div>
        ) : null}
        <Stack align="center" gap="2" className="max-w-xl">
          <p className="m-0 text-base font-semibold text-text">{title}</p>
          {description ? <p className="m-0 text-sm text-text-muted">{description}</p> : null}
        </Stack>
        {children}
        {action ? <div className="pt-2">{action}</div> : null}
      </Stack>
    </PageContainer>
  );
}
