import type { ReactNode } from "react";

export type V0NavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
};
