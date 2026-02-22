import { createPrismaClientWithRetry } from "../src/prismaClient.js";
import { resetDemoState } from "../src/dev/demoSeed.js";

async function main() {
  const prisma = await createPrismaClientWithRetry();
  try {
    const result = await resetDemoState(prisma);
    console.log("Demo reset complete", result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Demo reset failed", error);
  process.exit(1);
});
