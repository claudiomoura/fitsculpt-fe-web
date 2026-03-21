import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { stripeCustomerId: { not: null } },
    data: { stripeCustomerId: null },
  });
  console.log(`Cleared stripeCustomerId for ${result.count} users`);
  await prisma.$disconnect();
}

main();
