import assert from "node:assert/strict";
import { validateAndRepairSlot } from "../validatorRepair.js";

const mockPrescription = {
  sets: 3,
  reps: "8-12",
  tempo: "2-0-2",
  rest: 90,
};

const mockCandidates = [
  { id: "ex1", name: "Bench Press", equipment: "gym", mainMuscleGroup: "chest", imageUrl: "url1" },
  { id: "ex2", name: "Incline Press", equipment: "gym", mainMuscleGroup: "chest", imageUrl: "url2" },
  { id: "ex3", name: "Squat", equipment: "gym", mainMuscleGroup: "quads", imageUrl: "url3" },
  { id: "ex4", name: "Deadlift", equipment: "gym", mainMuscleGroup: "hamstrings", imageUrl: "url4" },
];

const alreadyUsed = new Set<string>();

function testValidSlot() {
  const selection = { exerciseId: "ex1", name: "Bench Press" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed,
  });

  assert.equal(result.exerciseId, "ex1", "Should return same exerciseId");
  assert.equal(result.name, "Bench Press", "Should return same name");
  assert.equal(result.repaired, false, "Should not be repaired");
  console.log("✅ Valid slot returns without repair");
}

function testNullExerciseIdRepair() {
  const selection = { exerciseId: null, name: "Pending" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed: new Set(),
  });

  assert.notEqual(result.exerciseId, null, "Should repair null exerciseId");
  assert.equal(result.repaired, true, "Should be marked as repaired");
  console.log("✅ Null exerciseId gets repaired");
}

function testInvalidExerciseIdRepair() {
  const selection = { exerciseId: "nonexistent", name: "Unknown" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed: new Set(),
  });

  assert.notEqual(result.exerciseId, "nonexistent", "Should repair nonexistent exerciseId");
  console.log("✅ Nonexistent exerciseId gets repaired");
}

function testPrescriptionApplied() {
  const selection = { exerciseId: "ex1", name: "Bench Press" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed,
  });

  assert.equal(result.sets, 3, "Should apply sets from prescription");
  assert.equal(result.reps, "8-12", "Should apply reps from prescription");
  assert.equal(result.tempo, "2-0-2", "Should apply tempo from prescription");
  assert.equal(result.rest, 90, "Should apply rest from prescription");
  console.log("✅ Prescription fields are applied");
}

function testRepairUsesImageUrl() {
  const selection = { exerciseId: null, name: "Pending" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed: new Set(),
  });

  assert.ok(result.imageUrl, "Should have imageUrl from candidate");
  console.log("✅ Repair uses candidate imageUrl");
}

function testAvoidsAlreadyUsed() {
  const selection = { exerciseId: null, name: "Pending" };
  const alreadyUsedWithOne = new Set<string>(["ex1"]);
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed: alreadyUsedWithOne,
  });

  assert.notEqual(result.exerciseId, "ex1", "Should avoid already used exercises");
  console.log("✅ Repair avoids already used exercises");
}

function testEmptyCandidatesReturnsNull() {
  const selection = { exerciseId: null, name: "Pending" };
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: [],
    alreadyUsed: new Set(),
  });

  assert.equal(result.exerciseId, null, "Should return null when no candidates");
  console.log("✅ Empty candidates returns null exerciseId");
}

function testAllUsedSelectsRemaining() {
  const selection = { exerciseId: null, name: "Pending" };
  const alreadyUsedMany = new Set<string>(["ex1", "ex2", "ex3"]);
  const result = validateAndRepairSlot({
    selection,
    prescription: mockPrescription,
    candidates: mockCandidates,
    alreadyUsed: alreadyUsedMany,
  });

  assert.equal(result.exerciseId, "ex4", "Should select remaining unused exercise");
  console.log("✅ All used except one selects remaining");
}

// Run all tests
console.log("Running validatorRepair tests...\n");
testValidSlot();
testNullExerciseIdRepair();
testInvalidExerciseIdRepair();
testPrescriptionApplied();
testRepairUsesImageUrl();
testAvoidsAlreadyUsed();
testEmptyCandidatesReturnsNull();
testAllUsedSelectsRemaining();
console.log("\n✅ All validatorRepair tests passed");