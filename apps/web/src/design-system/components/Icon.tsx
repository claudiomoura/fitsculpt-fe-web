import type { JSX, SVGProps } from "react";
import { cn } from "@/lib/classNames";

export type IconName =
  | "sparkles"
  | "dumbbell"
  | "book"
  | "clipboard-list"
  | "chef-hat"
  | "info"
  | "warning"
  | "check"
  | "circle"
  | "minus"
  | "clock"
  | "image"
  | "close"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "calendar"
  | "link";

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
  "clipboard-list": (
    <path
      d="M9 3h6a2 2 0 012 2h1a2 2 0 012 2v11a3 3 0 01-3 3H7a3 3 0 01-3-3V7a2 2 0 012-2h1a2 2 0 012-2zm0 2v1h6V5H9zm-1 6h1.5a1 1 0 100-2H8a1 1 0 100 2zm4 0h4a1 1 0 100-2h-4a1 1 0 100 2zm-4 5h1.5a1 1 0 100-2H8a1 1 0 100 2zm4 0h4a1 1 0 100-2h-4a1 1 0 100 2z"
      fill="currentColor"
    />
  ),
  "chef-hat": (
    <path
      d="M8 18h8v1a2 2 0 01-2 2h-4a2 2 0 01-2-2v-1zm9-1H7v-2.4a4.8 4.8 0 01-3-4.4 4.6 4.6 0 017.8-3.3A4.3 4.3 0 0115 5.5 5 5 0 0120 10a4.8 4.8 0 01-3 4.6V17zm-8-2h6v-1.8l1-.3a2.8 2.8 0 002-2.7A3 3 0 0015 7.5a2.6 2.6 0 00-2 .9l-1 .9-.7-1.1A2.6 2.6 0 009 7a2.6 2.6 0 00-2.4 3.6 2.8 2.8 0 001.9 2.2l.5.2V15z"
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
  circle: (
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
  ),
  minus: (
    <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="M6 17l4-4 3 3 3-3 2 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  close: (
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  "chevron-down": (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  "chevron-left": (
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  "chevron-right": (
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
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
