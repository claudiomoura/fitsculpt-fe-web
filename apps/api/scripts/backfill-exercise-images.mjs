import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Ruta donde están las imágenes (desde apps/api -> apps/web/public/...)
const webPublic = path.resolve(process.cwd(), "../web/public");
const baseDir = path.join(webPublic, "exercise-db", "exercises");

function listImageUrls(folder) {
  const dir = path.join(baseDir, folder);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.map(f => `/exercise-db/exercises/${folder}/${f}`);
}

const items = await prisma.exercise.findMany({
  where: { sourceId: { startsWith: "free-exercise-db:" } },
  select: { id: true, sourceId: true },
});

let updated = 0;

for (const it of items) {
  const folder = it.sourceId.split(":")[1];
  if (!folder) continue;

  const imageUrls = listImageUrls(folder);
  const imageUrl = imageUrls[0] ?? null;

  await prisma.exercise.update({
    where: { id: it.id },
    data: { imageUrls, imageUrl },
  });

  updated++;
}

console.log("Updated exercises:", updated);
await prisma.$disconnect();
