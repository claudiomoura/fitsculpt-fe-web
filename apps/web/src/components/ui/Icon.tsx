import type { JSX, SVGProps } from "react";
import { cn } from "@/lib/classNames";

export type IconName =
  | "sparkles"
  | "dumbbell"
  | "book"
  | "info"
  | "warning"
  | "check"
  | "close"
  | "chevron-down";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const ICONS: Record<IconName, JSX.Element> = {
  sparkles: (
    <path
      d="M12 2l1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4L12 2zm7 9l.9 2.4L22 14l-2.1.6L19 17l-.9-2.4L16 14l2.1-.6L19 11zM4 13l.9 2.4L7 16l-2.1.6L4 19l-.9-2.4L1 16l2.1-.6L4 13z"
      fill="currentColor"
    />
  ),
  dumbbell: (
    <path
      d="M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM6 9h2v6H6V9zm10 0h2v6h-2V9zM8 11h8v2H8v-2z"
      fill="currentColor"
    />
  ),
  book: (
    <path
      d="M4 4h10a3 3 0 013 3v11a2 2 0 00-2-2H5a1 1 0 01-1-1V4zm13 2a3 3 0 00-3-3H5a2 2 0 00-2 2v12a3 3 0 013-3h9a2 2 0 012 2V6z"
      fill="currentColor"
    />
  ),
  info: (
    <path
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14h-2v-6h2v6zm0-8h-2V6h2v2z"
      fill="currentColor"
    />
  ),
  warning: (
    <path
      d="M12 3l9 16H3l9-16zm1 11h-2v2h2v-2zm0-6h-2v4h2V8z"
      fill="currentColor"
    />
  ),
  check: (
    <path
      d="M9 16l-4-4 1.4-1.4L9 13.2l8.6-8.6L19 6l-10 10z"
      fill="currentColor"
    />
  ),
  close: (
    <path
      d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  "chevron-down": (
    <path
      d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
};

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("ui-icon", className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}
