import { Prisma, type PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_DEMO_SALT = "$2a$10$CwTycUXWue0Thq9StjUM0u";

const DEMO_GYM = {
  code: process.env.DEMO_GYM_CODE?.trim().toUpperCase() ?? "DEMO-BETA",
  activationCode: process.env.DEMO_GYM_ACTIVATION_CODE?.trim().toUpperCase() ?? "DEMO-BETA-ACT",
  name: process.env.DEMO_GYM_NAME ?? "FitSculpt Demo Beta Gym",
} as const;

const DEMO_USERS = {
  manager: {
    email: process.env.DEMO_MANAGER_EMAIL ?? "demo.manager@fitsculpt.local",
    password: process.env.DEMO_MANAGER_PASSWORD ?? "DemoManager123!",
    name: process.env.DEMO_MANAGER_NAME ?? "Demo Manager",
    appRole: "ADMIN" as const,
    gymRole: "ADMIN" as const,
  },
  trainer: {
    email: process.env.DEMO_TRAINER_EMAIL ?? "demo.trainer@fitsculpt.local",
    password: process.env.DEMO_TRAINER_PASSWORD ?? "DemoTrainer123!",
    name: process.env.DEMO_TRAINER_NAME ?? "Demo Trainer",
    appRole: "USER" as const,
    gymRole: "TRAINER" as const,
  },
  memberOne: {
    email: process.env.DEMO_MEMBER_1_EMAIL ?? "demo.member1@fitsculpt.local",
    password: process.env.DEMO_MEMBER_1_PASSWORD ?? "DemoMember123!",
    name: process.env.DEMO_MEMBER_1_NAME ?? "Demo Member One",
    appRole: "USER" as const,
    gymRole: "MEMBER" as const,
  },
  memberTwo: {
    email: process.env.DEMO_MEMBER_2_EMAIL ?? "demo.member2@fitsculpt.local",
    password: process.env.DEMO_MEMBER_2_PASSWORD ?? "DemoMember123!",
    name: process.env.DEMO_MEMBER_2_NAME ?? "Demo Member Two",
    appRole: "USER" as const,
    gymRole: "MEMBER" as const,
  },
} as const;

const DEMO_ASSIGNED_PLAN = {
  title: "DEMO: Full Body Intro",
  notes: "Assigned plan for beta sales demo.",
  goal: "Build consistency",
  level: "Beginner",
  daysPerWeek: 3,
  focus: "Full body",
  equipment: "Gym",
  startDate: new Date("2024-01-01T00:00:00.000Z"),
  daysCount: 3650,
} as const;

const DEMO_ASSIGNED_DAY = {
  date: new Date("2024-01-02T09:00:00.000Z"),
  label: "Día A",
  focus: "Strength",
  duration: 45,
  order: 1,
  exercises: [
    { name: "Sentadilla trasera con barra", sets: 3, reps: "8" },
    { name: "Jalón al pecho", sets: 3, reps: "10" },
  ],
} as const;

type DemoAccountSummary = {
  email: string;
  password: string;
  gymRole: "ADMIN" | "TRAINER" | "MEMBER";
};

async function upsertDemoUser(
  tx: Prisma.TransactionClient,
  user: {
    email: string;
    password: string;
    name: string;
    appRole: "ADMIN" | "USER";
    gymRole: "ADMIN" | "TRAINER" | "MEMBER";
  },
) {
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_DEMO_SALT);
  const now = new Date();

  const persisted = await tx.user.upsert({
    where: { email: user.email },
    create: {
      email: user.email,
      passwordHash,
      name: user.name,
      provider: "email",
      role: user.appRole,
      plan: "PRO",
      emailVerifiedAt: now,
    },
    update: {
      passwordHash,
      name: user.name,
      provider: "email",
      role: user.appRole,
      plan: "PRO",
      emailVerifiedAt: now,
      deletedAt: null,
      isBlocked: false,
    },
  });

  await tx.userProfile.upsert({
    where: { userId: persisted.id },
    create: {
      userId: persisted.id,
      tracking: {
        checkins: [],
        weights: [],
        photos: [],
        workouts: [],
      },
    },
    update: {},
  });

  return persisted;
}

export async function seedDemoState(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const gym = await tx.gym.upsert({
      where: { code: DEMO_GYM.code },
      create: {
        code: DEMO_GYM.code,
        activationCode: DEMO_GYM.activationCode,
        name: DEMO_GYM.name,
      },
      update: {
        activationCode: DEMO_GYM.activationCode,
        name: DEMO_GYM.name,
      },
    });

    const manager = await upsertDemoUser(tx, DEMO_USERS.manager);
    const trainer = await upsertDemoUser(tx, DEMO_USERS.trainer);
    const memberOne = await upsertDemoUser(tx, DEMO_USERS.memberOne);
    const memberTwo = await upsertDemoUser(tx, DEMO_USERS.memberTwo);

    const demoUserIds = [manager.id, trainer.id, memberOne.id, memberTwo.id];

    await tx.gymMembership.deleteMany({
      where: {
        userId: { in: demoUserIds },
        gymId: { not: gym.id },
      },
    });

    const memberOnePlan = await tx.trainingPlan.upsert({
      where: {
        userId_startDate_daysCount: {
          userId: memberOne.id,
          startDate: DEMO_ASSIGNED_PLAN.startDate,
          daysCount: DEMO_ASSIGNED_PLAN.daysCount,
        },
      },
      create: {
        userId: memberOne.id,
        ...DEMO_ASSIGNED_PLAN,
        days: {
          create: [
            {
              date: DEMO_ASSIGNED_DAY.date,
              label: DEMO_ASSIGNED_DAY.label,
              focus: DEMO_ASSIGNED_DAY.focus,
              duration: DEMO_ASSIGNED_DAY.duration,
              order: DEMO_ASSIGNED_DAY.order,
              exercises: {
                create: DEMO_ASSIGNED_DAY.exercises.map((exercise) => ({ ...exercise })),
              },
            },
          ],
        },
      },
      update: {
        title: DEMO_ASSIGNED_PLAN.title,
        notes: DEMO_ASSIGNED_PLAN.notes,
        goal: DEMO_ASSIGNED_PLAN.goal,
        level: DEMO_ASSIGNED_PLAN.level,
        daysPerWeek: DEMO_ASSIGNED_PLAN.daysPerWeek,
        focus: DEMO_ASSIGNED_PLAN.focus,
        equipment: DEMO_ASSIGNED_PLAN.equipment,
        days: {
          deleteMany: {},
          create: [
            {
              date: DEMO_ASSIGNED_DAY.date,
              label: DEMO_ASSIGNED_DAY.label,
              focus: DEMO_ASSIGNED_DAY.focus,
              duration: DEMO_ASSIGNED_DAY.duration,
              order: DEMO_ASSIGNED_DAY.order,
              exercises: {
                create: DEMO_ASSIGNED_DAY.exercises.map((exercise) => ({ ...exercise })),
              },
            },
          ],
        },
      },
    });

    const memberships = [
      { userId: manager.id, role: DEMO_USERS.manager.gymRole, assignedTrainingPlanId: null },
      { userId: trainer.id, role: DEMO_USERS.trainer.gymRole, assignedTrainingPlanId: null },
      { userId: memberOne.id, role: DEMO_USERS.memberOne.gymRole, assignedTrainingPlanId: memberOnePlan.id },
      { userId: memberTwo.id, role: DEMO_USERS.memberTwo.gymRole, assignedTrainingPlanId: null },
    ] as const;

    for (const membership of memberships) {
      await tx.gymMembership.upsert({
        where: {
          gymId_userId: {
            gymId: gym.id,
            userId: membership.userId,
          },
        },
        create: {
          gymId: gym.id,
          userId: membership.userId,
          role: membership.role,
          status: "ACTIVE",
          assignedTrainingPlanId: membership.assignedTrainingPlanId,
        },
        update: {
          role: membership.role,
          status: "ACTIVE",
          assignedTrainingPlanId: membership.assignedTrainingPlanId,
        },
      });
    }

    const accounts: DemoAccountSummary[] = [
      { email: DEMO_USERS.manager.email, password: DEMO_USERS.manager.password, gymRole: DEMO_USERS.manager.gymRole },
      { email: DEMO_USERS.trainer.email, password: DEMO_USERS.trainer.password, gymRole: DEMO_USERS.trainer.gymRole },
      { email: DEMO_USERS.memberOne.email, password: DEMO_USERS.memberOne.password, gymRole: DEMO_USERS.memberOne.gymRole },
      { email: DEMO_USERS.memberTwo.email, password: DEMO_USERS.memberTwo.password, gymRole: DEMO_USERS.memberTwo.gymRole },
    ];

    return {
      gym: {
        id: gym.id,
        code: gym.code,
        activationCode: gym.activationCode,
      },
      usersSeeded: accounts.length,
      accounts,
      assignedTrainingPlanId: memberOnePlan.id,
    };
  });
}
