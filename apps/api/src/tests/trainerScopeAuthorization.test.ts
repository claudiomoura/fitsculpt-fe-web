import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerTrainerRoutes } from "../routes/trainer.js";

type AnyRecord = Record<string, unknown>;

async function main() {
  let trainingDeleteCalls = 0;
  let recipeDeleteCalls = 0;
  let exerciseCreateCalls = 0;

  const prisma = {
    gymMembership: {
      findFirst: async ({ where }: { where: AnyRecord }) => {
        if (where.userId === "trainer-user" && where.gymId === undefined) {
          return { id: "m-trainer", userId: "trainer-user", gymId: "gym-a", role: "TRAINER", status: "ACTIVE" };
        }
        return null;
      },
    },
    trainingPlan: {
      findFirst: async ({ where }: { where: AnyRecord }) => {
        if (where.id === "plan-foreign") {
          const gymId = (where.user as AnyRecord | undefined)?.gymMemberships as AnyRecord | undefined;
          if ((gymId?.some as AnyRecord | undefined)?.gymId === "gym-a") {
            return null;
          }
          return { id: "plan-foreign" };
        }
        if (where.id === "plan-local") {
          return { id: "plan-local" };
        }
        return null;
      },
      delete: async () => {
        trainingDeleteCalls += 1;
        return { id: "deleted" };
      },
      findMany: async () => [],
      create: async () => ({ id: "created" }),
    },
    nutritionPlan: {
      findMany: async () => [],
      create: async () => ({ id: "np-created" }),
      findFirst: async () => null,
      update: async () => ({ id: "np-updated" }),
    },
    trainingDay: {
      findFirst: async ({ where }: { where: AnyRecord }) => {
        if (where.id !== "day-foreign") return { id: "day-local" };
        const planFilter = ((where.plan as AnyRecord | undefined)?.is as AnyRecord | undefined)?.user as AnyRecord | undefined;
        const gymId = ((planFilter?.gymMemberships as AnyRecord | undefined)?.some as AnyRecord | undefined)?.gymId;
        if (gymId === "gym-a") {
          return null;
        }
        return { id: "day-foreign" };
      },
    },
    trainingExercise: {
      create: async () => {
        exerciseCreateCalls += 1;
        return { id: "exercise-created" };
      },
      findFirst: async () => null,
      delete: async () => ({ id: "exercise-deleted" }),
    },
    recipe: {
      findMany: async () => [],
      create: async () => ({ id: "recipe-created" }),
      findFirst: async ({ where }: { where: AnyRecord }) => {
        if (where.id === "recipe-foreign" && where.trainerId === "trainer-user") {
          return null;
        }
        return { id: "recipe-any" };
      },
      delete: async () => {
        recipeDeleteCalls += 1;
        return { id: "recipe-deleted" };
      },
    },
    recipeIngredient: {
      createMany: async () => ({ count: 0 }),
    },
  } as any;

  const app = Fastify();
  registerTrainerRoutes(app, {
    prisma,
    requireUser: async () => ({ id: "trainer-user" }),
  } as any);

  try {
    const foreignPlanResponse = await app.inject({
      method: "GET",
      url: "/trainer/plans/plan-foreign",
    });
    assert.equal(foreignPlanResponse.statusCode, 404);
    assert.deepEqual(foreignPlanResponse.json(), { error: "NOT_FOUND" });

    const deleteForeignPlanResponse = await app.inject({
      method: "DELETE",
      url: "/trainer/plans/plan-foreign",
    });
    assert.equal(deleteForeignPlanResponse.statusCode, 404);
    assert.equal(trainingDeleteCalls, 0);

    const createForeignExerciseResponse = await app.inject({
      method: "POST",
      url: "/trainer/plans/plan-foreign/days/day-foreign/exercises",
      payload: {
        exerciseId: "ex-1",
        sets: 3,
      },
    });
    assert.equal(createForeignExerciseResponse.statusCode, 404);
    assert.equal(exerciseCreateCalls, 0);

    const deleteForeignRecipeResponse = await app.inject({
      method: "DELETE",
      url: "/trainer/recipes/recipe-foreign",
    });
    assert.equal(deleteForeignRecipeResponse.statusCode, 404);
    assert.equal(recipeDeleteCalls, 0);
  } finally {
    await app.close();
  }

  console.log("trainer scope authorization test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
