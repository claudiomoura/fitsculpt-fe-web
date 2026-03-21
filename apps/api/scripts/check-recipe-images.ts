import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { name: true, photoUrl: true, category: true, source: true },
    take: 15,
    orderBy: { name: "asc" },
  });

  console.log("Category     | Source   | Image | Name");
  console.log("─────────────┼──────────┼───────┼─────────────────────────────────────");
  for (const r of recipes) {
    const hasImg = r.photoUrl ? "✅" : "❌";
    console.log(
      `${(r.category ?? "?").padEnd(12)} | ${(r.source ?? "none").padEnd(8)} | ${hasImg}     | ${r.name}`
    );
  }

  const total = await prisma.recipe.count();
  const withPhoto = await prisma.recipe.count({
    where: { photoUrl: { not: null } },
  });
  const bySource = await prisma.recipe.groupBy({
    by: ["source"],
    _count: true,
  });

  console.log(`\nTotal: ${total} | With photo: ${withPhoto} | Without: ${total - withPhoto}`);
  console.log("By source:", JSON.stringify(bySource));
  await prisma.$disconnect();
}

main();
