import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, "..");
const distDir = path.join(apiRoot, "dist");

await rm(distDir, { recursive: true, force: true });
console.log(`cleaned ${distDir}`);
