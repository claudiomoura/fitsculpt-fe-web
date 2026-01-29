export type NavSection = "summary" | "training" | "nutrition" | "account" | "admin";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
};

export type NavSectionGroup = {
  id: NavSection;
  labelKey: string;
  items: NavItem[];
};

export type MobileTabAction = "quickActions";

export type MobileTab = {
  id: string;
  href?: string;
  labelKey: string;
  icon: "sparkles" | "dumbbell" | "book" | "info" | "check";
  action?: MobileTabAction;
  badgeCount?: number;
};

export const mainTabsMobile: MobileTab[] = [
  {
    id: "today",
    href: "/app/hoy",
    labelKey: "nav.today",
    icon: "sparkles",
  },
  {
    id: "plan",
    href: "/app/entrenamiento",
    labelKey: "nav.plan",
    icon: "dumbbell",
  },
  {
    id: "log",
    labelKey: "nav.log",
    icon: "check",
    action: "quickActions",
  },
  {
    id: "library",
    href: "/app/biblioteca",
    labelKey: "nav.library",
    icon: "book",
  },
  {
    id: "profile",
    href: "/app/profile",
    labelKey: "nav.profile",
    icon: "info",
  },
];

export const sidebarUser: NavSectionGroup[] = [
  {
    id: "summary",
    labelKey: "navSections.summary",
    items: [
      { id: "dashboard", href: "/app", labelKey: "nav.dashboard" },
      { id: "tracking", href: "/app/seguimiento", labelKey: "nav.tracking" },
      { id: "feed", href: "/app/feed", labelKey: "nav.feed" },
    ],
  },
  {
    id: "training",
    labelKey: "navSections.training",
    items: [
      { id: "training-plan", href: "/app/entrenamiento", labelKey: "nav.trainingPlan" },
      { id: "library", href: "/app/biblioteca", labelKey: "nav.library" },
    ],
  },
  {
    id: "nutrition",
    labelKey: "navSections.nutrition",
    items: [
      { id: "nutrition", href: "/app/nutricion", labelKey: "nav.nutrition" },
      { id: "diet-plans", href: "/app/dietas", labelKey: "nav.dietPlans" },
      { id: "macros", href: "/app/macros", labelKey: "nav.macros" },
    ],
  },
  {
    id: "account",
    labelKey: "navSections.account",
    items: [
      { id: "profile", href: "/app/profile", labelKey: "nav.profile" },
      { id: "settings", href: "/app/settings", labelKey: "nav.settings" },
    ],
  },
];

export const sidebarAdmin: NavSectionGroup[] = [
  {
    id: "admin",
    labelKey: "navSections.admin",
    items: [
      { id: "admin-dashboard", href: "/app/admin", labelKey: "nav.admin" },
      { id: "admin-users", href: "/app/admin/users", labelKey: "nav.adminUsers" },
    ],
  },
];
