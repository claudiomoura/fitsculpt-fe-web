import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type DenseTableProps = TableHTMLAttributes<HTMLTableElement>;

export function DenseTable({ className, ...props }: DenseTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border-subtle bg-surface">
      <table className={cn('w-full min-w-[560px] border-separate border-spacing-0 text-sm text-text', className)} {...props} />
    </div>
  );
}

export type DenseTableHeadProps = HTMLAttributes<HTMLTableSectionElement>;

export function DenseTableHead({ className, ...props }: DenseTableHeadProps) {
  return <thead className={cn('bg-surface-muted', className)} {...props} />;
}

export type DenseTableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

export function DenseTableBody({ className, ...props }: DenseTableBodyProps) {
  return <tbody className={cn('[&_tr:last-child_td]:border-b-0', className)} {...props} />;
}

export type DenseTableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  interactive?: boolean;
};

export function DenseTableRow({ className, interactive = false, ...props }: DenseTableRowProps) {
  return (
    <tr
      className={cn(
        'align-middle',
        interactive ? 'transition-colors hover:bg-surface-muted/70' : undefined,
        className,
      )}
      {...props}
    />
  );
}

export type DenseTableHeadCellProps = ThHTMLAttributes<HTMLTableCellElement>;

export function DenseTableHeadCell({ className, ...props }: DenseTableHeadCellProps) {
  return (
    <th
      className={cn(
        'border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted',
        className,
      )}
      {...props}
    />
  );
}

export type DenseTableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export function DenseTableCell({ className, ...props }: DenseTableCellProps) {
  return <td className={cn('border-b border-border-subtle px-3 py-2 text-sm text-text', className)} {...props} />;
}
