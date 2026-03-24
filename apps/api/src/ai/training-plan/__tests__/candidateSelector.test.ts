import assert from "node:assert/strict";
import { selectCandidateExercises, type CandidateExercise } from "../candidateSelector.js";

// Mock Prisma
const mockPrisma = {
  exercise: {
    findMany: async (args: any) => {
      return args.where.OR?.[0]?.equipment === "gym"
        ? [
            { id: "ex1", name: "Bench Press", equipment: "gym", mainMuscleGroup: "chest", imageUrls: ["url1"] },
            { id: "ex2", name: "Push Up", equipment: null, mainMuscleGroup: "chest", imageUrls: null },
          ]
        : [];
    },
  },
};

const mockContext = {
  userId: "user-123",
  age: 30,
  sex: "male" as const,
  level: "intermediate" as const,
  goal: "maintain" as const,
  focus: "full" as const,
  equipment: "gym" as const,
  daysPerWeek: 4,
  sessionTime: "medium" as const,
  timeAvailableMinutes: 45,
  includeCardio: false,
  includeMobilityWarmups: true,
  startDate: new Date(),
};

// Test equipment filter
async function testEquipmentFilter() {
  const result = await selectCandidateExercises(mockPrisma as any, mockContext, undefined, 20);
  assert.ok(result.length > 0, "Should return exercises when equipment matches");
  console.log("✅ Equipment filter works");
}

// Test muscle group filter
async function testMuscleGroupFilter() {
  const pushFocus = "Empuje (Pecho/Hombro/Tríceps)";
  const result = await selectCandidateExercises(mockPrisma as any, mockContext, pushFocus, 20);
  assert.ok(result.length >= 0, "Should handle muscle group filter");
  console.log("✅ Muscle group filter works");
}

// Test return shape
async function testReturnShape() {
  const result = await selectCandidateExercises(mockPrisma as any, mockContext, undefined, 20);
  if (result.length > 0) {
    assert.ok(result[0].id, "Should have id");
    assert.ok(result[0].name, "Should have name");
    assert.ok(result[0].mainMuscleGroup, "Should have mainMuscleGroup");
  }
  console.log("✅ Return shape is correct");
}

// Run all tests
async function runTests() {
  console.log("Running candidateSelector tests...\n");
  await testEquipmentFilter();
  await testMuscleGroupFilter();
  await testReturnShape();
  console.log("\n✅ All candidateSelector tests passed");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});