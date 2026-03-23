import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CATEGORY_IMAGES: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
  snack: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80",
  fish: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80",
  seafood: "https://images.unsplash.com/photo-1565680018093-ebb15f005a4e?w=800&q=80",
  poultry: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80",
  beef: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=80",
  vegetarian: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80",
  rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&q=80",
  wrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
  other: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
};

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { photoUrl: null },
    select: { id: true, name: true, category: true },
  });

  console.log(`Found ${recipes.length} recipes without images`);

  for (const recipe of recipes) {
    const category = recipe.category ?? "other";
    const imageUrl = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.other;

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        photoUrl: imageUrl,
        imageUrls: [imageUrl],
        source: "unsplash",
      },
    });

    console.log(`✅ ${recipe.name} → ${category} fallback`);
  }

  const total = await prisma.recipe.count();
  const withPhoto = await prisma.recipe.count({
    where: { photoUrl: { not: null } },
  });

  console.log(`\nDone! ${withPhoto}/${total} recipes have images`);
  await prisma.$disconnect();
}

main();
