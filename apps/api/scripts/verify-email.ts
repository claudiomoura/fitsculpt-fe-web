import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npm run verify-email -- <email>");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to mark email as verified in production via script.");
    process.exit(1);
  }

  const result = await prisma.user.updateMany({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });

  if (result.count === 0) {
    console.warn(`No user found for ${email}.`);
  } else {
    console.log(`Marked ${email} as verified.`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
