import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiRoot } from "./testPaths.js";

const requiredBackendRoutes = [
  "/ai/nutrition-plan",
  "/ai/nutrition-plan/generate",
  "/ai/training-plan/generate",
] as const;

function extractPostRouteLiterals(content: string): Set<string> {
  const postRouteLiteralPattern = /app\.post\(\s*["']([^"']+)["']/g;
  const registeredRoutes = new Set<string>();

  for (const match of content.matchAll(postRouteLiteralPattern)) {
    const [, routePath] = match;
    if (routePath) {
      registeredRoutes.add(routePath);
    }
  }

  return registeredRoutes;
}

function assertRequiredRoutesPresent(
  label: string,
  registeredRoutes: Set<string>,
): void {
  const missingRoutes = requiredBackendRoutes.filter(
    (routePath) => !registeredRoutes.has(routePath),
  );

  assert.equal(
    missingRoutes.length,
    0,
    `${label} is missing required backend route literals:\n${missingRoutes.join("\n")}`,
  );
}

async function main() {
  const srcIndexPath = path.join(apiRoot, "src/index.ts");
  const srcIndex = await readFile(srcIndexPath, "utf8");

  const registeredRoutes = extractPostRouteLiterals(srcIndex);
  assertRequiredRoutesPresent("src/index.ts", registeredRoutes);

  console.log("route parity contract test passed (critical backend route literals)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
