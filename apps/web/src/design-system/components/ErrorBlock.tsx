import type { ComponentProps, ReactNode } from 'react';

import { EmptyBlock } from './EmptyBlock';

export type ErrorBlockProps = Omit<ComponentProps<typeof EmptyBlock>, 'action'> & {
  retryAction?: ReactNode;
};

export function ErrorBlock({
  title,
  description,
  icon,
  retryAction,
  ...props
}: ErrorBlockProps) {
  return (
    <EmptyBlock
      title={title}
      description={description}
      icon={icon}
      action={retryAction}
      {...props}
    />
  );
}
