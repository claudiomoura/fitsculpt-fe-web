import { canAccessAdmin, canAccessTrainer, type RoleAccessInput } from "@/config/roleAccess";
import { canAccessFeature, type EntitlementFeature, type UiEntitlements } from "@/lib/entitlements";

export type NavSection = "fitness" | "training" | "nutrition" | "account" | "more" | "admin" | "trainer" | "development";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  meta?: string;
  disabled?: boolean;
  disabledNoteKey?: string;
  feature?: EntitlementFeature;
  upgradeHref?: string;
};

export type NavSectionGroup = {
  id: NavSection;
  labelKey: string;
  items: NavItem[];
};

const TOP_LEVEL_ROUTE_ALIASES = [
  { canonical: "/app/hoy", legacy: "/app/dashboard" },
  { canonical: "/app/hoy", legacy: "/app/today" },
  { canonical: "/app/entrenamiento", legacy: "/app/training" },
  { canonical: "/app/nutricion", legacy: "/app/nutrition" },
  { canonical: "/app/seguimiento", legacy: "/app/progress" },
] as const;

const LIBRARY_ROUTE_ALIASES = [
  { canonical: "/app/biblioteca/planes-entrenamiento", legacy: "/app/biblioteca/entrenamientos" },
  { canonical: "/app/biblioteca/planes-nutricion", legacy: "/app/dietas" },
] as const;

function canonicalizePath(path: string): string {
  for (const alias of [...TOP_LEVEL_ROUTE_ALIASES, ...LIBRARY_ROUTE_ALIASES]) {
    if (path === alias.legacy || path.startsWith(`${alias.legacy}/`)) {
      return `${alias.canonical}${path.slice(alias.legacy.length)}`;
    }
  }
  return path;
}

export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalizedPathname = canonicalizePath(pathname);
  const normalizedHref = canonicalizePath(href);
  if (normalizedHref === "/app") return normalizedPathname === "/app";
  return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
}

export function getMostSpecificActiveHref(pathname: string | null, sections: NavSectionGroup[]): string | null {
  if (!pathname) return null;

  const hrefs = sections.flatMap((section) => section.items.map((item) => item.href));
  const activeHrefs = hrefs.filter((href) => isPathActive(pathname, href));

  if (!activeHrefs.length) return null;

  return activeHrefs.sort((a, b) => b.length - a.length)[0] ?? null;
}


export type MobileTab = {
  id: string;
  href?: string;
  label?: string;
  labelKey?: string;
  icon: "tab-home" | "tab-workout" | "tab-nutrition" | "tab-progress" | "tab-profile" | "tab-gym" | "sparkles" | "dumbbell" | "book" | "info" | "check";
  badgeCount?: number;
  feature?: EntitlementFeature;
  upgradeHref?: string;
};

export const mainTabsMobile: MobileTab[] = [
  {
    id: "today",
    href: "/app/hoy",
    label: "Hoy",
    icon: "tab-home",
  },
  {
    id: "training",
    href: "/app/entrenamiento",
    label: "Entreno",
    icon: "tab-workout",
  },
  {
    id: "nutrition",
    href: "/app/nutricion",
    label: "Nutrición",
    icon: "tab-nutrition",
  },
  { id: "tracking", href: "/app/seguimiento", label: "Progreso", icon: "tab-progress" },
  { id: "profile", href: "/app/profile", label: "Perfil", icon: "tab-profile" },
];


export const trainerTabsMobile: MobileTab[] = [
  {
    id: "trainer-home",
    href: "/app/trainer",
    labelKey: "nav.trainer",
    icon: "sparkles",
  },
  {
    id: "trainer-clients",
    href: "/app/trainer/clients",
    labelKey: "nav.trainerClients",
    icon: "book",
  },
  {
    id: "trainer-requests",
    href: "/app/trainer/requests",
    labelKey: "nav.trainerRequests",
    icon: "info",
  },
  {
    id: "trainer-plans",
    href: "/app/trainer/plans",
    labelKey: "nav.trainerPlans",
    icon: "dumbbell",
  },
  {
    id: "trainer-nutrition-plans",
    href: "/app/trainer/nutrition-plans",
    labelKey: "nav.trainerNutritionPlans",
    icon: "sparkles",
  },
  {
    id: "trainer-recipes",
    href: "/app/trainer/recipes",
    labelKey: "nav.trainerRecipes",
    icon: "book",
  },
  {
    id: "trainer-exercises",
    href: "/app/trainer/exercises",
    labelKey: "nav.trainerExercises",
    icon: "check",
  },
];

export const sidebarUser: NavSectionGroup[] = [
  {
    id: "fitness",
    labelKey: "navSections.fitness",
    items: [
      { id: "today", href: "/app/hoy", labelKey: "nav.today" },
      { id: "training", href: "/app/entrenamiento", labelKey: "nav.trainingCalendar", feature: "strength" },
    ],
  },
  {
    id: "nutrition",
    labelKey: "navSections.nutrition",
    items: [
      { id: "nutrition-calendar", href: "/app/nutricion", labelKey: "nav.nutritionCalendar", feature: "nutrition" },
    ],
  },
  {
    id: "account",
    labelKey: "navSections.account",
    items: [
      { id: "tracking", href: "/app/seguimiento", labelKey: "nav.tracking" },
      { id: "body-scan", href: "/app/body-scan", labelKey: "nav.bodyScan" },
      { id: "settings", href: "/app/settings", labelKey: "nav.settings" },
      { id: "profile", href: "/app/profile", labelKey: "nav.profile" },
    ],
  },
  {
    id: "more",
    labelKey: "navSections.more",
    items: [
      { id: "dashboard", href: "/app", labelKey: "nav.progress" },
      { id: "exercise-library", href: "/app/biblioteca", labelKey: "nav.exerciseLibrary" },
      { id: "training-plans", href: "/app/biblioteca/planes-entrenamiento", labelKey: "nav.trainingPlans", feature: "strength" },
      { id: "recipe-library", href: "/app/biblioteca/recetas", labelKey: "nav.recipeLibrary", feature: "nutrition" },
      { id: "diet-plans", href: "/app/biblioteca/planes-nutricion", labelKey: "nav.nutritionPlans", feature: "nutrition" },
      { id: "macros", href: "/app/macros", labelKey: "nav.macros", feature: "nutrition" },
      { id: "weekly-review", href: "/app/weekly-review", labelKey: "nav.weeklyReview" },
      { id: "coach", href: "/app/coach", labelKey: "nav.coach" },
      { id: "feed", href: "/app/feed", labelKey: "nav.feed" },
      { id: "gym", href: "/app/gym", labelKey: "nav.gym" },
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
      { id: "admin-gyms", href: "/app/admin/gyms", labelKey: "nav.adminGyms" },
      {
        id: "admin-gym-requests",
        href: "/app/admin/gym-requests",
        labelKey: "nav.gymJoinRequests",
        disabled: true,
        disabledNoteKey: "common.comingSoon",
      },
      { id: "admin-labs", href: "/app/admin/labs", labelKey: "nav.adminLabs" },
      { id: "admin-preview", href: "/app/admin/preview", labelKey: "nav.adminPreview" },
    ],
  },
];

export const sidebarTrainer: NavSectionGroup[] = [
  {
    id: "trainer",
    labelKey: "navSections.trainer",
    items: [
      { id: "trainer-home", href: "/app/trainer", labelKey: "nav.trainer" },
      { id: "trainer-clients", href: "/app/trainer/clients", labelKey: "nav.trainerClients" },
      { id: "trainer-requests", href: "/app/trainer/requests", labelKey: "nav.trainerRequests" },
      { id: "trainer-plans", href: "/app/trainer/plans", labelKey: "nav.trainerPlans" },
      { id: "trainer-nutrition-plans", href: "/app/trainer/nutrition-plans", labelKey: "nav.trainerNutritionPlans" },
      { id: "trainer-recipes", href: "/app/trainer/recipes", labelKey: "nav.trainerRecipes" },
      {
        id: "trainer-exercises",
        href: "/app/trainer/exercises",
        labelKey: "nav.trainerExercises",
      },
    ],
  },
];

const sidebarAccountOnly: NavSectionGroup[] = sidebarUser.filter((section) => section.id === "account");
const sidebarTrainerAccountOnly: NavSectionGroup[] = sidebarAccountOnly.map((section) => ({
  ...section,
  items: section.items.filter((item) => item.id !== "tracking"),
}));

export function buildUserSections(input: RoleAccessInput): NavSectionGroup[] {
  const isAdmin = canAccessAdmin(input);
  const isTrainer = canAccessTrainer(input);

  if (isAdmin) {
    return sidebarUser;
  }

  if (isTrainer) {
    return sidebarTrainerAccountOnly;
  }

  return sidebarUser;
}

export function buildNavigationSections(input: RoleAccessInput): NavSectionGroup[] {
  const isAdmin = canAccessAdmin(input);
  const isTrainer = canAccessTrainer(input);

  if (isTrainer && !isAdmin) {
    return [...sidebarTrainer, ...buildUserSections(input)];
  }

  const userSections = buildUserSections(input);

  if (!isAdmin) {
    return userSections;
  }

  if (!input.isDev) {
    return [...userSections, ...sidebarAdmin, ...sidebarTrainer];
  }

  const devSection: NavSectionGroup = {
    id: "development",
    labelKey: "navSections.development",
    items: [{ id: "dev-page", href: "/app/dev", labelKey: "nav.dev" }],
  };

  return [...userSections, ...sidebarAdmin, ...sidebarTrainer, devSection];
}

export function applyEntitlementGating(sections: NavSectionGroup[], entitlements: UiEntitlements): NavSectionGroup[] {
  if (entitlements.status !== "known") {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (!item.feature || canAccessFeature(entitlements, item.feature)) {
          return item;
        }

        return {
          ...item,
          disabled: true,
          disabledNoteKey: item.disabledNoteKey ?? "common.upgradeRequired",
        };
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export function applyTabEntitlementGating(tabs: MobileTab[], entitlements: UiEntitlements): MobileTab[] {
  if (entitlements.status !== "known") {
    return tabs;
  }

  return tabs.filter((tab) => !tab.feature || canAccessFeature(entitlements, tab.feature));
}
