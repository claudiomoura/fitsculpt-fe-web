import assert from "node:assert/strict";
import { buildEffectiveEntitlements } from "../entitlements.js";

function run() {
  const free = buildEffectiveEntitlements({ plan: "FREE", isAdmin: false });
  assert.equal(free.modules.ai.enabled, false);
  assert.equal(free.legacy.tier, "FREE");

  const strength = buildEffectiveEntitlements({ plan: "STRENGTH_AI", isAdmin: false });
  assert.equal(strength.modules.strength.enabled, true);
  assert.equal(strength.modules.nutrition.enabled, false);
  assert.equal(strength.modules.ai.enabled, true);

  const adminFree = buildEffectiveEntitlements({ plan: "FREE", isAdmin: true });
  assert.equal(adminFree.modules.ai.enabled, true);
  assert.equal(adminFree.modules.ai.reason, "admin_override");
  assert.equal(adminFree.legacy.tier, "PRO");

  console.log("entitlements tests passed");
}

run();
