import assert from "node:assert/strict";
import { normalizeExerciseName } from "../utils/normalizeExerciseName.js";

assert.equal(normalizeExerciseName("  Press   de banca  "), "press de banca");
assert.equal(normalizeExerciseName("Sentadilla!!! frontal??"), "sentadilla frontal");
assert.equal(normalizeExerciseName("Peso_muerto-romano"), "peso muerto romano");

console.log("normalizeExerciseName test passed");
