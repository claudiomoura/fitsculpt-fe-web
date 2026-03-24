import assert from "node:assert/strict";
import { computePrescriptionFromContext } from "../prescriptionEngine.js";

function testPrescriptionBeginner() {
  const prescription = computePrescriptionFromContext({
    level: "beginner",
    goal: "maintain",
    focus: "full",
  }, "full");
  assert.ok(prescription.sets, "Should have sets");
  assert.ok(prescription.reps, "Should have reps");
  assert.ok(prescription.tempo, "Should have tempo");
  assert.ok(prescription.rest, "Should have rest");
  console.log("✅ Beginner prescription returns valid structure");
}

function testPrescriptionIntermediate() {
  const prescription = computePrescriptionFromContext({
    level: "intermediate",
    goal: "bulk",
    focus: "upperLower",
  }, "upper");
  assert.ok(prescription.sets, "Should have sets");
  assert.ok(prescription.reps, "Should have reps");
  console.log("✅ Intermediate prescription returns valid structure");
}

function testPrescriptionAdvanced() {
  const prescription = computePrescriptionFromContext({
    level: "advanced",
    goal: "cut",
    focus: "ppl",
  }, "push");
  assert.ok(prescription.sets, "Should have sets");
  console.log("✅ Advanced prescription returns valid structure");
}

function testBulkGoalHasMoreSets() {
  const maintain = computePrescriptionFromContext({
    level: "intermediate",
    goal: "maintain",
    focus: "full",
  }, "full");

  const bulk = computePrescriptionFromContext({
    level: "intermediate",
    goal: "bulk",
    focus: "full",
  }, "full");

  assert.ok(bulk.sets >= maintain.sets, "Bulk goal should have at least as many sets as maintain");
  console.log("✅ Bulk goal has more sets than maintain");
}

function testCutGoalHasFewerSets() {
  const maintain = computePrescriptionFromContext({
    level: "intermediate",
    goal: "maintain",
    focus: "full",
  }, "full");

  const cut = computePrescriptionFromContext({
    level: "intermediate",
    goal: "cut",
    focus: "full",
  }, "full");

  assert.ok(cut.sets <= maintain.sets, "Cut goal should have at most as many sets as maintain");
  console.log("✅ Cut goal has fewer sets than maintain");
}

function testAdvancedHasMoreSetsThanBeginner() {
  const beginner = computePrescriptionFromContext({
    level: "beginner",
    goal: "maintain",
    focus: "full",
  }, "full");

  const advanced = computePrescriptionFromContext({
    level: "advanced",
    goal: "maintain",
    focus: "full",
  }, "full");

  assert.ok(advanced.sets > beginner.sets, "Advanced should have more sets than beginner");
  console.log("✅ Advanced level has more sets than beginner");
}

function testTempoFormat() {
  const prescription = computePrescriptionFromContext({
    level: "intermediate",
    goal: "maintain",
    focus: "full",
  }, "full");

  assert.ok(/^\d+-\d+-\d+$/.test(prescription.tempo), "Tempo should be in format X-X-X");
  console.log("✅ Tempo format is correct");
}

function testRestIsNumber() {
  const prescription = computePrescriptionFromContext({
    level: "intermediate",
    goal: "maintain",
    focus: "full",
  }, "full");

  assert.equal(typeof prescription.rest, "number", "Rest should be a number");
  assert.ok(prescription.rest > 0, "Rest should be positive");
  console.log("✅ Rest is a positive number");
}

function testDifferentGoalsProduceDifferentPrescriptions() {
  const cut = computePrescriptionFromContext({
    level: "intermediate",
    goal: "cut",
    focus: "full",
  }, "full");

  const bulk = computePrescriptionFromContext({
    level: "intermediate",
    goal: "bulk",
    focus: "full",
  }, "full");

  const different = cut.sets !== bulk.sets || cut.reps !== bulk.reps || cut.rest !== bulk.rest;
  assert.ok(different, "Different goals should produce different prescriptions");
  console.log("✅ Different goals produce different prescriptions");
}

// Run all tests
console.log("Running prescriptionEngine tests...\n");
testPrescriptionBeginner();
testPrescriptionIntermediate();
testPrescriptionAdvanced();
testBulkGoalHasMoreSets();
testCutGoalHasFewerSets();
testAdvancedHasMoreSetsThanBeginner();
testTempoFormat();
testRestIsNumber();
testDifferentGoalsProduceDifferentPrescriptions();
console.log("\n✅ All prescriptionEngine tests passed");