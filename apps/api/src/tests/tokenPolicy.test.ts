import assert from "node:assert/strict";
import { tokenGrantForPlan } from "../billing/tokenPolicy.js";

assert.equal(tokenGrantForPlan("PRO"), 50_000);
assert.equal(tokenGrantForPlan("STRENGTH_AI"), 40_000);
assert.equal(tokenGrantForPlan("NUTRI_AI"), 40_000);
assert.equal(tokenGrantForPlan("FREE"), 0);

console.log("token policy test passed");
