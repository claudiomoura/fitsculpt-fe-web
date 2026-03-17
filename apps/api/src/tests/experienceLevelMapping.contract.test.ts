import assert from "node:assert/strict";
import { mapExperienceLevelToTrainingPlanLevel } from "../ai/training-plan/experienceLevelMapping.js";

assert.equal(mapExperienceLevelToTrainingPlanLevel("beginner"), "beginner");
assert.equal(mapExperienceLevelToTrainingPlanLevel("intermediate"), "intermediate");
assert.equal(mapExperienceLevelToTrainingPlanLevel("advanced"), "advanced");

console.log("experience level mapping contract test passed");
