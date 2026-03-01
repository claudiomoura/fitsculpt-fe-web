import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, "..");
const distDir = path.join(apiRoot, "dist");

function runBuild() {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(command, ["run", "build"], {
    cwd: apiRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function listFilesRecursively(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.posix.join(prefix, entry.name);
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listFilesRecursively(absolutePath, relativePath);
      }

      return [relativePath];
    }),
  );

  return paths.flat().sort();
}

async function hashDistFiles() {
  const files = await listFilesRecursively(distDir);
  const fileHashes = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(path.join(distDir, filePath));
      const hash = createHash("sha256").update(content).digest("hex");
      return `${filePath}:${hash}`;
    }),
  );

  return fileHashes.join("\n");
}

runBuild();
const firstBuildDigest = await hashDistFiles();

runBuild();
const secondBuildDigest = await hashDistFiles();

assert.equal(
  secondBuildDigest,
  firstBuildDigest,
  "dist rebuild is not deterministic: output differs between consecutive builds",
);

console.log("dist rebuild reproducibility check passed");
