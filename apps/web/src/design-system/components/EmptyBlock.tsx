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
      <Stack align="center" gap="5" className="text-center">
        {icon ? (
          <div className="glass-card flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--color-text-secondary)] shadow-sm">
            {icon}
          </div>
        ) : null}
        <Stack align="center" gap="2" className="max-w-xl">
          <p className="m-0 text-xl font-semibold tracking-tight text-text md:text-2xl">{title}</p>
          {description ? <p className="m-0 text-sm leading-relaxed text-text-muted md:text-base">{description}</p> : null}
        </Stack>
        {children}
        {action ? <div className="pt-1 md:pt-2">{action}</div> : null}
      </Stack>
    </PageContainer>
  );
}
