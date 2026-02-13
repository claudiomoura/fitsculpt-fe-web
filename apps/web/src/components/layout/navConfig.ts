import { canAccessAdmin, canAccessTrainer, type RoleAccessInput } from "@/config/roleAccess";

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


export type MobileTab = {
  id: string;
  href?: string;
  labelKey: string;
  icon: "sparkles" | "dumbbell" | "book" | "info" | "check";
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
    id: "dashboard",
    href: "/app",
    labelKey: "nav.dashboard",
    icon: "info",
  },
  {
    id: "plan",
    href: "/app/entrenamiento",
    labelKey: "nav.plan",
    icon: "dumbbell",
  },
  {
    id: "library",
    href: "/app/biblioteca",
    labelKey: "nav.library",
    icon: "book",
  },
  {
    id: "nutrition",
    href: "/app/nutricion",
    labelKey: "nav.nutrition",
    icon: "sparkles",
  },
  {
    id: "tracking",
    href: "/app/seguimiento",
    labelKey: "nav.tracking",
    icon: "check",
  },
];

export const sidebarUser: NavSectionGroup[] = [
  {
    id: "summary",
    labelKey: "navSections.summary",
    items: [
      { id: "today", href: "/app/hoy", labelKey: "nav.today" },
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
      { id: "trainer-home", href: "/app/trainer", labelKey: "nav.trainer" },
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
      { id: "admin-labs", href: "/app/admin/labs", labelKey: "nav.adminLabs" },
      { id: "admin-preview", href: "/app/admin/preview", labelKey: "nav.adminPreview" },
    ],
  },
];

export function buildUserSections(input: RoleAccessInput): NavSectionGroup[] {
  if (canAccessTrainer(input)) {
    return sidebarUser;
  }

  return sidebarUser.map((section) => {
    if (section.id !== "training") return section;

    return {
      ...section,
      items: section.items.filter((item) => item.id !== "trainer-home"),
    };
  });
}

export function buildNavigationSections(input: RoleAccessInput): NavSectionGroup[] {
  const userSections = buildUserSections(input);

  if (!canAccessAdmin(input)) {
    return userSections;
  }

  return [...userSections, ...sidebarAdmin];
}
