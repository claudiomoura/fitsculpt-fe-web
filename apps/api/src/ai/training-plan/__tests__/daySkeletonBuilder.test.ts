import assert from "node:assert/strict";
import { buildDaySkeletons } from "../daySkeletonBuilder.js";

// Test buildDaySkeletons
function testBuildSkeletons() {
  const baseInput = {
    level: "intermediate" as const,
    goal: "maintain" as const,
    startDate: new Date("2024-01-01"),
  };

  // Test 3 days per week
  const skeletons3 = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 3,
    focus: "full" as const,
  });
  assert.equal(skeletons3.length, 3, "Should build 3 skeletons for 3 days per week");

  // Test 4 days per week
  const skeletons4 = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 4,
    focus: "upperLower" as const,
  });
  assert.equal(skeletons4.length, 4, "Should build 4 skeletons for 4 days per week");

  // Test 5 days per week
  const skeletons5 = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 5,
    focus: "ppl" as const,
  });
  assert.equal(skeletons5.length, 5, "Should build 5 skeletons for 5 days per week");

  // Test 6 days per week
  const skeletons6 = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 6,
    focus: "ppl" as const,
  });
  assert.equal(skeletons6.length, 6, "Should build 6 skeletons for 6 days per week");

  // Test sequential dates
  assert.equal(skeletons3[0].date, "2024-01-01", "First date should be startDate");
  assert.equal(skeletons3[1].date, "2024-01-02", "Second date should be startDate + 1 day");
  assert.equal(skeletons3[2].date, "2024-01-03", "Third date should be startDate + 2 days");

  // Test skeleton properties
  skeletons3.forEach((skeleton) => {
    assert.ok(skeleton.label, "Should have label");
    assert.ok(skeleton.focus, "Should have focus");
    assert.ok(typeof skeleton.exerciseSlots === "number", "Should have exerciseSlots number");
  });

  // Test full body labels
  const fullBodySkeletons = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 3,
    focus: "full" as const,
  });
  const fullBodyFocus = fullBodySkeletons.map(s => s.focus);
  assert.ok(fullBodyFocus.some(f => f.includes("Full body")), "Full body focus should use Full body labels: " + fullBodyFocus.join(", "));
  console.log("✅ Full body focus labels: " + fullBodyFocus.join(", "));

  // Test upper/lower labels
  const upperLowerSkeletons = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 4,
    focus: "upperLower" as const,
  });
  const upperLowerFocus = upperLowerSkeletons.map(s => s.focus);
  assert.ok(upperLowerFocus.some((f) => f.includes("Tren superior")), "Should have upper labels");
  assert.ok(upperLowerFocus.some((f) => f.includes("Tren inferior")), "Should have lower labels");
  console.log("✅ Upper/lower focus labels: " + upperLowerFocus.join(", "));

  // Test PPL labels
  const pplSkeletons = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 6,
    focus: "ppl" as const,
  });
  const pplFocus = pplSkeletons.map(s => s.focus);
  assert.ok(pplFocus.some((f) => f.includes("Empuje")), "Should have push labels");
  assert.ok(pplFocus.some((f) => f.includes("Tirón")), "Should have pull labels");
  assert.ok(pplFocus.some((f) => f.includes("Pierna")), "Should have leg labels");
  console.log("✅ PPL focus labels: " + pplFocus.join(", "));

  // Test advanced level has more slots than beginner
  const beginnerSkeletons = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 3,
    focus: "full" as const,
    level: "beginner" as const,
  });
  const advancedSkeletons = buildDaySkeletons({
    ...baseInput,
    daysPerWeek: 3,
    focus: "full" as const,
    level: "advanced" as const,
  });
  assert.ok(
    advancedSkeletons[0].exerciseSlots >= beginnerSkeletons[0].exerciseSlots,
    "Advanced should have at least as many slots as beginner"
  );

  console.log("✅ daySkeletonBuilder.test.ts passed");
}

testBuildSkeletons();