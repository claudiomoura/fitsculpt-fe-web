import { canAccessAdmin, canAccessTrainer, type RoleAccessInput } from "@/config/roleAccess";

export type NavSection = "summary" | "training" | "nutrition" | "account" | "admin" | "trainer" | "development";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  meta?: string;
  disabled?: boolean;
  disabledNoteKey?: string;
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
      { id: "gym", href: "/app/gym", labelKey: "nav.gym" },
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
      { id: "trainer-requests", href: "/app/trainer/requests", labelKey: "nav.gymJoinRequests" },
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
      { id: "dev-workouts", href: "/app/workouts", labelKey: "nav.workouts", meta: "/app/workouts" },
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

  if (!input.isDev) {
    return [...userSections, ...sidebarAdmin, ...sidebarTrainer];
  }

  return [...userSections, ...sidebarAdmin, ...sidebarTrainer, ...sidebarDevelopment];
}
