import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiRoot } from "./testPaths.js";

const requiredRoutePatterns = [
  /app\.post\(\s*["']\/trainer\/nutrition-plans["']/, 
  /app\.get\(\s*["']\/trainer\/nutrition-plans["']/, 
  /app\.get\(\s*["']\/trainer\/nutrition-plans\/:id["']/, 
  /app\.post\(\s*["']\/trainer\/clients\/:userId\/assigned-nutrition-plan["']/, 
  /app\.get\(\s*["']\/members\/me\/assigned-nutrition-plan["']/, 
] as const;

async function main() {
  const srcIndexPath = path.join(apiRoot, "src/index.ts");
  const srcIndex = await readFile(srcIndexPath, "utf8");

  for (const routePattern of requiredRoutePatterns) {
    assert.equal(
      routePattern.test(srcIndex),
      true,
      `src/index.ts is missing required gym nutrition route pattern: ${routePattern.source}`,
    );
  }

  console.log("gym nutrition routes contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
