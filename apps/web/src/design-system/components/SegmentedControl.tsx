import Link from 'next/link';
import { useId } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { createTransition } from '../motion';

export type SegmentedControlOption = {
  id: string;
  label: ReactNode;
  href?: string;
};

export type SegmentedControlProps = HTMLAttributes<HTMLDivElement> & {
  options: SegmentedControlOption[];
  value: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
};

export function SegmentedControl({ options, value, onChange, className, ariaLabel, ...props }: SegmentedControlProps) {
  const segmentedControlId = useId();

  const handleKeyboardChange = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = options.findIndex((option) => option.id === value);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange?.(options[(currentIndex + 1) % options.length].id);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange?.(options[(currentIndex - 1 + options.length) % options.length].id);
    }
  };

  return (
    <div className={cn('inline-flex rounded-xl bg-surface-muted p-1', className)} role="tablist" aria-orientation="horizontal" aria-label={ariaLabel} {...props}>
      {options.map((option) => {
        const active = option.id === value;
        const optionId = `${segmentedControlId}-${option.id}`;

        if (option.href) {
          return (
            <Link
              key={option.id}
              id={optionId}
              href={option.href}
              className={getSegmentedControlButtonClassName(active)}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              tabIndex={active ? 0 : -1}
            >
              {option.label}
            </Link>
          );
        }

        return (
          <SegmentedControlButton
            key={option.id}
            id={optionId}
            active={active}
            onClick={() => onChange?.(option.id)}
            onKeyDown={handleKeyboardChange}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
          >
            {option.label}
          </SegmentedControlButton>
        );
      })}
    </div>
  );
}

type SegmentedControlButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

function getSegmentedControlButtonClassName(active: boolean, className?: string) {
  return cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted',
    'hover:-translate-y-px active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    active ? 'bg-surface text-text' : 'hover:text-text',
    className,
  );
}

function SegmentedControlButton({ active = false, className, ...props }: SegmentedControlButtonProps) {
  return (
    <button
      type="button"
      className={getSegmentedControlButtonClassName(active, className)}
      style={{ transition: createTransition('interactive') }}
      {...props}
    />
  );
}
