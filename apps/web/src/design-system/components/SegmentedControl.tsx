import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { createTransition } from '../motion';

export type SegmentedControlOption = {
  id: string;
  label: ReactNode;
};

export type SegmentedControlProps = HTMLAttributes<HTMLDivElement> & {
  options: SegmentedControlOption[];
  value: string;
  onChange?: (id: string) => void;
};

export function SegmentedControl({ options, value, onChange, className, ...props }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex rounded-xl bg-surface-muted p-1', className)} role="tablist" aria-orientation="horizontal" {...props}>
      {options.map((option) => {
        const active = option.id === value;

        return (
          <SegmentedControlButton key={option.id} active={active} onClick={() => onChange?.(option.id)} role="tab" aria-selected={active}>
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

function SegmentedControlButton({ active = false, className, ...props }: SegmentedControlButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted',
        'hover:-translate-y-px active:scale-[0.98]',
        active ? 'bg-surface text-text' : 'hover:text-text',
        className,
      )}
      style={{ transition: createTransition('interactive') }}
      {...props}
    />
  );
}
