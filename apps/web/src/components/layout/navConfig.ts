export type NavSection = "summary" | "training" | "nutrition" | "account" | "admin";

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
  { id: "admin", labelKey: "navSections.admin" },
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
  {
    id: "admin-dashboard",
    href: "/app/admin",
    labelKey: "nav.admin",
    section: "admin",
    adminOnly: true,
  },
  {
    id: "admin-users",
    href: "/app/admin/users",
    labelKey: "nav.adminUsers",
    section: "admin",
    adminOnly: true,
  },
];
