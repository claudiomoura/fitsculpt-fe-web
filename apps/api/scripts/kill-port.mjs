/**
 * Kills any process listening on port 4000.
 * Used as `predev` to prevent EADDRINUSE errors when restarting the API.
 * Cross-platform: works on Windows, macOS, and Linux.
 */
import { execSync } from "child_process";

const PORT = 4000;

function killPort(port) {
  try {
    if (process.platform === "win32") {
      // Windows: find PID via netstat and kill via taskkill
      try {
        const output = execSync(`netstat -ano | findstr :${port}`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        const pids = [...new Set(
          output
            .split("\n")
            .map((line) => line.trim().split(/\s+/).pop())
            .filter((pid) => pid && /^\d+$/.test(pid))
        )];
        for (const pid of pids) {
          try {
            execSync(`taskkill //PID ${pid} //F`, { stdio: "pipe" });
            console.log(`[predev] Killed PID ${pid} on port ${port}`);
          } catch {
            // Process already gone
          }
        }
      } catch {
        // No process found
      }
    } else {
      // macOS/Linux: use lsof
      try {
        const output = execSync(`lsof -ti :${port}`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        const pids = output.split("\n").filter((pid) => pid.trim());
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid.trim()}`, { stdio: "pipe" });
            console.log(`[predev] Killed PID ${pid.trim()} on port ${port}`);
          } catch {
            // Process already gone
          }
        }
      } catch {
        // No process found on port
      }
    }
  } catch {
    // No process found on port — this is fine
  }
}

killPort(PORT);
