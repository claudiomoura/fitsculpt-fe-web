import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizePositiveMetric(value: unknown) {
  if (typeof value !== "number") return value;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function sanitizeProfile(profile: unknown) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { changed: false, nextProfile: profile };
  }

  const nextProfile = { ...(profile as Record<string, unknown>) };
  let changed = false;

  const keys: Array<"age" | "heightCm" | "weightKg" | "goalWeightKg"> = [
    "age",
    "heightCm",
    "weightKg",
    "goalWeightKg",
  ];

  for (const key of keys) {
    const currentValue = nextProfile[key];
    const normalized = normalizePositiveMetric(currentValue);
    if (normalized !== currentValue) {
      nextProfile[key] = normalized;
      changed = true;
    }
  }

  return { changed, nextProfile };
}

async function main() {
  const profiles = await prisma.userProfile.findMany({
    select: {
      id: true,
      profile: true,
    },
  });

  let updated = 0;

  for (const item of profiles) {
    const { changed, nextProfile } = sanitizeProfile(item.profile);
    if (!changed) continue;

    await prisma.userProfile.update({
      where: { id: item.id },
      data: { profile: nextProfile as object },
    });
    updated += 1;
  }

  console.log(`profile repair complete: scanned=${profiles.length} updated=${updated}`);
}

main()
  .catch((error) => {
    console.error("profile repair failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
