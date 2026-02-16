import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sample = await prisma.exercise.findMany({
  take: 5,
  select: { id:true, name:true, source:true, sourceId:true, imageUrl:true, imageUrls:true, mediaUrl:true }
});

console.dir(sample, { depth: 5 });

await prisma.$disconnect();
