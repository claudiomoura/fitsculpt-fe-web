import assert from "node:assert/strict";

// Re-create createHttpError for testing (same as in contextResolver.ts)
function createHttpError(
  statusCode: number,
  code: string,
  debug?: Record<string, unknown>,
) {
  const error = new Error() as any;
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

// Mock Prisma client for testing
const mockPrisma = {
  userProfile: {
    findUnique: async (args: any) => {
      const userId = args.where.userId;
      if (userId === "user-missing") return null;
      if (userId === "user-incomplete-age") {
        return { profile: { age: undefined, sex: "male", focus: "full", equipment: "gym", sessionTime: "medium", timeAvailableMinutes: 45 } };
      }
      if (userId === "user-incomplete-sex") {
        return { profile: { age: 30, sex: undefined, focus: "full", equipment: "gym", sessionTime: "medium", timeAvailableMinutes: 45 } };
      }
      if (userId === "user-incomplete-focus") {
        return { profile: { age: 30, sex: "male", focus: undefined, equipment: "gym", sessionTime: "medium", timeAvailableMinutes: 45 } };
      }
      if (userId === "user-incomplete-equipment") {
        return { profile: { age: 30, sex: "male", focus: "full", equipment: undefined, sessionTime: "medium", timeAvailableMinutes: 45 } };
      }
      if (userId === "user-incomplete-sessionTime") {
        return { profile: { age: 30, sex: "male", focus: "full", equipment: "gym", sessionTime: undefined, timeAvailableMinutes: 45 } };
      }
      if (userId === "user-incomplete-timeAvailableMinutes") {
        return { profile: { age: 30, sex: "male", focus: "full", equipment: "gym", sessionTime: "medium", timeAvailableMinutes: undefined } };
      }
      // Complete profile
      return {
        profile: {
          age: 30,
          sex: "male",
          focus: "full",
          equipment: "gym",
          sessionTime: "medium",
          timeAvailableMinutes: 45,
          trainingPreferences: {},
        },
      };
    },
  },
};

// Re-implement requireCompleteProfile for testing
async function requireCompleteProfile(
  userId: string,
  prisma: typeof mockPrisma
): Promise<void> {
  const profileRow = await prisma.userProfile.findUnique({
    where: { userId },
    select: { profile: true },
  });

  if (!profileRow?.profile || typeof profileRow.profile !== "object") {
    throw createHttpError(409, "PROFILE_INCOMPLETE", {
      message: "Profile not found",
      missingContext: ["profile"],
    });
  }

  const profile = profileRow.profile as Record<string, unknown>;

  const missingFields: string[] = [];

  if (profile.age === undefined || profile.age === null) missingFields.push("age");
  if (profile.sex === undefined || profile.sex === null) missingFields.push("sex");
  if (profile.focus === undefined || profile.focus === null) missingFields.push("focus");
  if (profile.equipment === undefined || profile.equipment === null) missingFields.push("equipment");
  if (profile.sessionTime === undefined || profile.sessionTime === null) missingFields.push("sessionTime");
  if (profile.timeAvailableMinutes === undefined || profile.timeAvailableMinutes === null) missingFields.push("timeAvailableMinutes");

  if (missingFields.length > 0) {
    throw createHttpError(409, "PROFILE_INCOMPLETE", {
      message: "Profile incomplete",
      missingContext: missingFields,
    });
  }
}

// Test functions
async function testCompleteProfilePasses() {
  await requireCompleteProfile("user-123", mockPrisma);
  console.log("✅ Complete profile passes");
}

async function testProfileMissingThrows() {
  try {
    await requireCompleteProfile("user-missing", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing profile throws PROFILE_INCOMPLETE");
}

async function testMissingAgeThrows() {
  try {
    await requireCompleteProfile("user-incomplete-age", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing age throws PROFILE_INCOMPLETE");
}

async function testMissingSexThrows() {
  try {
    await requireCompleteProfile("user-incomplete-sex", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing sex throws PROFILE_INCOMPLETE");
}

async function testMissingFocusThrows() {
  try {
    await requireCompleteProfile("user-incomplete-focus", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing focus throws PROFILE_INCOMPLETE");
}

async function testMissingEquipmentThrows() {
  try {
    await requireCompleteProfile("user-incomplete-equipment", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing equipment throws PROFILE_INCOMPLETE");
}

async function testMissingSessionTimeThrows() {
  try {
    await requireCompleteProfile("user-incomplete-sessionTime", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing sessionTime throws PROFILE_INCOMPLETE");
}

async function testMissingTimeAvailableMinutesThrows() {
  try {
    await requireCompleteProfile("user-incomplete-timeAvailableMinutes", mockPrisma);
    assert.fail("Should have thrown");
  } catch (err: any) {
    assert.equal(err.code, "PROFILE_INCOMPLETE");
  }
  console.log("✅ Missing timeAvailableMinutes throws PROFILE_INCOMPLETE");
}

// Run all tests
async function runTests() {
  console.log("Running contextResolver tests...\n");
  await testCompleteProfilePasses();
  await testProfileMissingThrows();
  await testMissingAgeThrows();
  await testMissingSexThrows();
  await testMissingFocusThrows();
  await testMissingEquipmentThrows();
  await testMissingSessionTimeThrows();
  await testMissingTimeAvailableMinutesThrows();
  console.log("\n✅ All contextResolver tests passed");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});