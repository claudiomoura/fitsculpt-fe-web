import { createPrismaClientWithRetry } from "../apps/api/src/prismaClient.js";
import { seedDemoState } from "../apps/api/src/dev/seed-demo.js";

async function main() {
  const startedAt = Date.now();
  const prisma = await createPrismaClientWithRetry();

  try {
    const result = await seedDemoState(prisma);
    const elapsedMs = Date.now() - startedAt;
    console.log("Demo seed complete", {
      elapsedMs,
      gym: result.gym,
      usersSeeded: result.usersSeeded,
      assignedTrainingPlanId: result.assignedTrainingPlanId,
      accounts: result.accounts,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Demo seed failed", error);
  process.exit(1);
});
