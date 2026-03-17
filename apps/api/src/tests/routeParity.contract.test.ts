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
  const routeFiles = [
    path.join(apiRoot, "src/index.ts"),
    path.join(apiRoot, "src/domains/ai/registerAiRoutes.ts"),
  ];

  const contents = await Promise.all(routeFiles.map((filePath) => readFile(filePath, "utf8")));
  const registeredRoutes = new Set<string>();

  for (const content of contents) {
    for (const routePath of extractPostRouteLiterals(content)) {
      registeredRoutes.add(routePath);
    }
  }

  assertRequiredRoutesPresent(routeFiles.join(", "), registeredRoutes);

  console.log("route parity contract test passed (critical backend route literals)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
