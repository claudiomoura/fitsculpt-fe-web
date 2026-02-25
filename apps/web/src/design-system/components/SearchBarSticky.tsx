import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';

export type SearchBarStickyProps = HTMLAttributes<HTMLDivElement> & {
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;
  leadingIcon?: ReactNode;
  trailingContent?: ReactNode;
  stickyOffsetClassName?: string;
};

export function SearchBarSticky({
  inputProps,
  leadingIcon,
  trailingContent,
  stickyOffsetClassName = 'top-0',
  className,
  ...props
}: SearchBarStickyProps) {
  return (
    <div
      className={cn(
        'sticky z-20 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-xl sm:px-6',
        stickyOffsetClassName,
        className,
      )}
      {...props}
    >
      <div
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-150 ease-out hover:border-border-subtle"
        style={{ boxShadow: elevation.sm }}
      >
        {leadingIcon ? <span className="shrink-0 text-text-muted">{leadingIcon}</span> : null}
        <input
          type="search"
          placeholder="Search"
          {...inputProps}
          className={cn(
            'w-full min-w-0 border-0 bg-transparent p-0 text-sm text-text placeholder:text-text-muted focus:outline-none',
            inputProps?.disabled ? 'cursor-not-allowed opacity-60' : undefined,
          )}
        />
        {trailingContent ? <div className="shrink-0">{trailingContent}</div> : null}
      </div>
    </div>
  );
}
