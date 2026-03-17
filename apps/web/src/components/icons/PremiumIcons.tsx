import type { SVGProps } from "react";

type PremiumIconProps = SVGProps<SVGSVGElement>;

function BasePremiumIcon({ children, ...props }: PremiumIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PremiumHomeIcon(props: PremiumIconProps) {
  return (
    <BasePremiumIcon {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M6.5 9.5V20a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.5" />
      <path d="M10 21v-5a2 2 0 1 1 4 0v5" />
    </BasePremiumIcon>
  );
}

export function PremiumWorkoutIcon(props: PremiumIconProps) {
  return (
    <BasePremiumIcon {...props}>
      <path d="M4.5 9.5v5" />
      <path d="M7.5 7.5v9" />
      <path d="M16.5 7.5v9" />
      <path d="M19.5 9.5v5" />
      <path d="M7.5 12h9" />
    </BasePremiumIcon>
  );
}

export function PremiumNutritionIcon(props: PremiumIconProps) {
  return (
    <BasePremiumIcon {...props}>
      <path d="M7.5 4.5v6" />
      <path d="M10 4.5v6" />
      <path d="M12.5 4.5v6" />
      <path d="M10 10.5V20" />
      <path d="M16.5 4.5c-1.5 2-2.5 4.5-2.5 7.5v8" />
    </BasePremiumIcon>
  );
}

export function PremiumProgressIcon(props: PremiumIconProps) {
  return (
    <BasePremiumIcon {...props}>
      <path d="M4 19.5h16" />
      <path d="M7 16.5V13" />
      <path d="M12 16.5V9" />
      <path d="M17 16.5V6" />
    </BasePremiumIcon>
  );
}

export function PremiumProfileIcon(props: PremiumIconProps) {
  return (
    <BasePremiumIcon {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </BasePremiumIcon>
  );
}
