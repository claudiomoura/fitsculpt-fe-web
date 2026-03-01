import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiRoot } from "./testPaths.js";

type CriticalRoute = {
  method: "post";
  path: string;
};

const nutritionRoutePaths = ["/ai/nutrition-plan", "/ai/nutrition-plan/generate"] as const;

const strictRegisteredRoutes: CriticalRoute[] = [
  { method: "post", path: "/ai/training-plan/generate" },
];

function routeRegistrationPattern(route: CriticalRoute) {
  const escapedPath = route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`app\\.${route.method}\\(\\s*[\"']${escapedPath}[\"']`);
}

function assertNutritionPathsPresent(label: string, content: string) {
  const missingPaths = nutritionRoutePaths.filter((routePath) => !content.includes(routePath));

  assert.equal(
    missingPaths.length,
    0,
    `${label} is missing critical AI nutrition paths:\n${missingPaths.join("\n")}`,
  );
}

function assertStrictRoutesPresent(label: string, content: string) {
  const missingRoutes = strictRegisteredRoutes
    .filter((route) => !routeRegistrationPattern(route).test(content))
    .map((route) => `${route.method.toUpperCase()} ${route.path}`);

  assert.equal(
    missingRoutes.length,
    0,
    `${label} is missing critical AI route registrations:\n${missingRoutes.join("\n")}`,
  );
}

async function assertRoutesPresent(label: string, content: string) {
  assertNutritionPathsPresent(label, content);
  assertStrictRoutesPresent(label, content);
}

async function main() {
  const srcIndexPath = path.join(apiRoot, "src/index.ts");
  const distIndexPath = path.join(apiRoot, "dist/index.js");

  const srcIndex = await readFile(srcIndexPath, "utf8");
  const distIndex = await readFile(distIndexPath, "utf8");

  await assertRoutesPresent("src/index.ts", srcIndex);
  await assertRoutesPresent("dist/index.js", distIndex);

  console.log("route parity contract test passed (src vs dist critical AI routes)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
