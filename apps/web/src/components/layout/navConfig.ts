export type NavSection = "summary" | "training" | "nutrition" | "account";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  section: NavSection;
  showInTopNav?: boolean;
  adminOnly?: boolean;
};

export const NAV_SECTIONS: Array<{ id: NavSection; labelKey: string }> = [
  { id: "summary", labelKey: "navSections.summary" },
  { id: "training", labelKey: "navSections.training" },
  { id: "nutrition", labelKey: "navSections.nutrition" },
  { id: "account", labelKey: "navSections.account" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/app",
    labelKey: "nav.dashboard",
    section: "summary",
    showInTopNav: true,
  },
  {
    id: "tracking",
    href: "/app/seguimiento",
    labelKey: "nav.tracking",
    section: "summary",
  },
  {
    id: "feed",
    href: "/app/feed",
    labelKey: "nav.feed",
    section: "summary",
    adminOnly: true, // Ajusta aquí si quieres mostrar esta sección a usuarios normales.
  },
  {
    id: "workouts",
    href: "/app/workouts",
    labelKey: "nav.workouts",
    section: "training",
    showInTopNav: true,
  },
  {
    id: "training-plan",
    href: "/app/entrenamiento",
    labelKey: "nav.trainingPlan",
    section: "training",
    showInTopNav: true,
  },
  {
    id: "nutrition",
    href: "/app/nutricion",
    labelKey: "nav.nutrition",
    section: "nutrition",
    showInTopNav: true,
  },
  {
    id: "library",
    href: "/app/biblioteca",
    labelKey: "nav.library",
    section: "training",
    showInTopNav: true,
  },
  {
    id: "macros",
    href: "/app/macros",
    labelKey: "nav.macros",
    section: "nutrition",
    adminOnly: true, // Ajusta aquí si quieres mostrar esta sección a usuarios normales.
  },
  {
    id: "profile",
    href: "/app/profile",
    labelKey: "nav.profile",
    section: "account",
  },
  {
    id: "settings",
    href: "/app/settings",
    labelKey: "nav.settings",
    section: "account",
  },
];
