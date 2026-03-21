import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(API_ROOT, ".env") });
dotenv.config({ path: path.join(API_ROOT, ".env.local"), override: true });

if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
  console.error("Refusing local db reset in production.");
  process.exit(1);
}

const env = {
  ...process.env,
  ALLOW_DB_RESET: "1",
};

const steps = [
  ["reset database", ["node", ["scripts/prisma-runner.mjs", "reset:safe", "--force", "--skip-seed", "--schema", "prisma/schema.prisma"]]],
  ["run seed", ["node", ["scripts/prisma-runner.mjs", "db", "seed"]]],
];

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function run() {
  for (const [label, [command, args]] of steps) {
    await runStep(label, command, args);
  }
}

function runStep(label, command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    const child = spawn(command, args, {
      cwd: API_ROOT,
      env,
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if ((code ?? 1) !== 0) {
        reject(new Error(`Step failed: ${label}`));
        return;
      }
      resolve();
    });
  });
}
