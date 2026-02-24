import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

export type NavItemVariant = 'default' | 'active';

export type NavItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: NavItemVariant;
  icon?: ReactNode;
};

const variantClasses: Record<NavItemVariant, string> = {
  default: 'text-text-muted hover:bg-surface-muted hover:text-text',
  active: 'bg-primary/10 text-primary',
};

export function NavItem({ variant = 'default', icon, className, children, ...props }: NavItemProps) {
  return (
    <a
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}
