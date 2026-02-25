import { canAccessAdmin, type RoleAccessInput } from "@/config/roleAccess";
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

export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
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
  labelKey: string;
  icon: "sparkles" | "dumbbell" | "book" | "info" | "check";
  badgeCount?: number;
  feature?: EntitlementFeature;
  upgradeHref?: string;
};

export const mainTabsMobile: MobileTab[] = [
  {
    id: "today",
    href: "/app/hoy",
    labelKey: "nav.today",
    icon: "sparkles",
  },
  {
    id: "training",
    href: "/app/entrenamiento",
    labelKey: "nav.trainingCalendar",
    icon: "dumbbell",
  },
  {
    id: "library",
    href: "/app/biblioteca",
    labelKey: "nav.exerciseLibrary",
    icon: "book",
  },
  {
    id: "nutrition",
    href: "/app/nutricion",
    labelKey: "nav.nutritionCalendar",
    icon: "sparkles",
    feature: "nutrition",
    upgradeHref: "/app/settings/billing",
  },
  { id: "settings", href: "/app/settings", labelKey: "nav.settings", icon: "info" },
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
    id: "trainer-plans",
    href: "/app/trainer/plans",
    labelKey: "nav.trainerPlans",
    icon: "dumbbell",
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
      { id: "training", href: "/app/entrenamiento", labelKey: "nav.trainingCalendar" },
      { id: "exercise-library", href: "/app/biblioteca", labelKey: "nav.exerciseLibrary" },
      { id: "training-plans", href: "/app/biblioteca/entrenamientos", labelKey: "nav.trainingPlans" },
    ],
  },
  {
    id: "nutrition",
    labelKey: "navSections.nutrition",
    items: [
      { id: "nutrition-calendar", href: "/app/nutricion", labelKey: "nav.nutritionCalendar", feature: "nutrition", upgradeHref: "/app/settings/billing" },
      { id: "recipe-library", href: "/app/biblioteca/recetas", labelKey: "nav.recipeLibrary", feature: "nutrition", upgradeHref: "/app/settings/billing" },
      { id: "diet-plans", href: "/app/dietas", labelKey: "nav.nutritionPlans", feature: "nutrition", upgradeHref: "/app/settings/billing" },
      { id: "macros", href: "/app/macros", labelKey: "nav.macros", feature: "nutrition", upgradeHref: "/app/settings/billing" },
    ],
  },
  {
    id: "account",
    labelKey: "navSections.account",
    items: [
      { id: "dashboard", href: "/app", labelKey: "nav.progress" },
      { id: "tracking", href: "/app/seguimiento", labelKey: "nav.tracking" },
      { id: "feed", href: "/app/feed", labelKey: "nav.feed" },
      { id: "weekly-review", href: "/app/weekly-review", labelKey: "nav.weeklyReview" },
      { id: "settings", href: "/app/settings", labelKey: "nav.settings" },
      { id: "profile", href: "/app/profile", labelKey: "nav.profile" },
      { id: "gym", href: "/app/gym", labelKey: "nav.gym", feature: "strength", upgradeHref: "/pricing" },
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
      { id: "trainer-plans", href: "/app/trainer/plans", labelKey: "nav.trainerPlans" },
      {
        id: "trainer-exercises",
        href: "/app/trainer/exercises",
        labelKey: "nav.trainerExercises",
      },
    ],
  },
];

export const sidebarDevelopment: NavSectionGroup[] = [
  {
    id: "development",
    labelKey: "navSections.development",
    items: [
      { id: "dev-trainer-home", href: "/app/trainer", labelKey: "nav.trainer", meta: "/app/trainer" },
      {
        id: "dev-trainer-requests",
        href: "/app/trainer/requests",
        labelKey: "nav.gymJoinRequests",
        meta: "/app/trainer/requests",
      },
      {
        id: "dev-trainer-clients",
        href: "/app/trainer/clients",
        labelKey: "nav.trainerClients",
        meta: "/app/trainer/clients",
      },
      {
        id: "dev-trainer-plans",
        href: "/app/trainer/plans",
        labelKey: "nav.trainerPlans",
        meta: "/app/trainer/plans",
      },
      {
        id: "dev-trainer-exercises",
        href: "/app/trainer/exercises",
        labelKey: "nav.trainerExercises",
        meta: "/app/trainer/exercises",
      },
      {
        id: "dev-trainer-exercises-new",
        href: "/app/trainer/exercises/new",
        labelKey: "nav.newExercise",
        meta: "/app/trainer/exercises/new",
      },
      { id: "dev-onboarding", href: "/app/onboarding", labelKey: "nav.onboarding", meta: "/app/onboarding" },
      { id: "dev-dashboard", href: "/app/dashboard", labelKey: "nav.dashboard", meta: "/app/dashboard" },
      { id: "dev-weekly-review", href: "/app/weekly-review", labelKey: "nav.weeklyReview", meta: "/app/weekly-review" },
      { id: "dev-workouts", href: "/app/entrenamiento", labelKey: "nav.workouts", meta: "/app/workouts" },
      {
        id: "dev-training-edit",
        href: "/app/entrenamiento/editar",
        labelKey: "nav.trainingEditor",
        meta: "/app/entrenamiento/editar",
      },
      {
        id: "dev-nutrition-edit",
        href: "/app/nutricion/editar",
        labelKey: "nav.nutritionEditor",
        meta: "/app/nutricion/editar",
      },
      {
        id: "dev-profile-legacy",
        href: "/app/profile/legacy",
        labelKey: "nav.legacyProfile",
        meta: "/app/profile/legacy",
      },
      {
        id: "dev-settings-billing",
        href: "/app/settings/billing",
        labelKey: "nav.billing",
        meta: "/app/settings/billing",
      },
      {
        id: "dev-library-workouts",
        href: "/app/biblioteca/entrenamientos",
        labelKey: "nav.workoutLibrary",
        meta: "/app/biblioteca/entrenamientos",
      },
      {
        id: "dev-library-recipes",
        href: "/app/biblioteca/recetas",
        labelKey: "nav.recipeLibrary",
        meta: "/app/biblioteca/recetas",
      },
      {
        id: "dev-admin-gym-requests",
        href: "/app/admin/gym-requests",
        labelKey: "nav.gymJoinRequests",
        meta: "/app/admin/gym-requests",
        disabled: true,
        disabledNoteKey: "common.comingSoon",
      },
      {
        id: "dev-admin-preview",
        href: "/app/admin/preview",
        labelKey: "nav.adminPreview",
        meta: "/app/admin/preview",
      },
    ],
  },
];

const sidebarAccountOnly: NavSectionGroup[] = sidebarUser
  .filter((section) => section.id === "account")
  .map((section) => ({
    ...section,
    items: [
      ...section.items,
      { id: "trainer-requests", href: "/app/trainer/requests", labelKey: "nav.gymJoinRequests" },
    ],
  }));

export function buildUserSections(input: RoleAccessInput): NavSectionGroup[] {
  const isAdmin = canAccessAdmin(input);
  const isTrainer = input.isCoach === true;

  if (isAdmin) {
    return sidebarUser;
  }

  if (isTrainer) {
    return sidebarAccountOnly;
  }

  return sidebarUser;
}

export function buildNavigationSections(input: RoleAccessInput): NavSectionGroup[] {
  const isAdmin = canAccessAdmin(input);
  const isTrainer = input.isCoach === true;

  if (isTrainer && !isAdmin) {
    return sidebarTrainer;
  }

  const userSections = buildUserSections(input);

  if (!isAdmin) {
    return userSections;
  }

  if (!input.isDev) {
    return [...userSections, ...sidebarAdmin, ...sidebarTrainer];
  }

  return [...userSections, ...sidebarAdmin, ...sidebarTrainer, ...sidebarDevelopment];
}

export function applyEntitlementGating(sections: NavSectionGroup[], entitlements: UiEntitlements): NavSectionGroup[] {
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
  return tabs.filter((tab) => !tab.feature || canAccessFeature(entitlements, tab.feature));
}
