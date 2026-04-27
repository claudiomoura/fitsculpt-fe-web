import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const REQUEST_TIMEOUT_MS = 30000;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const isCheckOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");

class LinearApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "LinearApiError";
  }
}

const TEAM_NAME = "Core";
const TEAM_KEY = "CORE";

const WORKFLOW_STATES = [
  { name: "Inbox", color: "#6B7280", type: "backlog", description: "New incoming issues" },
  { name: "Planned", color: "#3B82F6", type: "unstarted", description: "Scheduled for upcoming work" },
  { name: "In Progress", color: "#F59E0B", type: "started", description: "actively being worked on" },
  { name: "Blocked", color: "#EF4444", type: "started", description: "Work is blocked waiting on something" },
  { name: "In Review", color: "#8B5CF6", type: "started", description: "Awaiting review" },
  { name: "Ready for Release", color: "#10B981", type: "started", description: "Ready to be released" },
  { name: "Done", color: "#22C55E", type: "completed", description: "Work is complete" },
  { name: "Canceled", color: "#9CA3AF", type: "cancelled", description: "Work was canceled" },
];

const CYCLES = [
  { name: "Beta Week 1", offsetWeeks: 0 },
  { name: "Beta Week 2", offsetWeeks: 1 },
  { name: "Beta Week 3", offsetWeeks: 2 },
  { name: "Beta Week 4", offsetWeeks: 3 },
];

loadEnvFiles();

const linearApiKey = process.env.LINEAR_API_KEY;
const runSummary = createRunSummary();

await main().catch((error) => {
  fail(error?.message ?? String(error));
});

async function main() {
  if (!linearApiKey) {
    fail("Missing LINEAR_API_KEY. Add it to the repo root .env.local or export it in your shell before running this script.");
  }

  if (typeof fetch !== "function") {
    fail("This script requires Node.js with global fetch support. Use Node.js 18 or newer.");
  }

  console.log("Fetching workspace snapshot...");
  const snapshot = await fetchWorkspaceSnapshot();

  const team = snapshot.teams.find((t) => t.name === TEAM_NAME || t.key === TEAM_KEY);
  if (!team) {
    fail(`Team "${TEAM_NAME}" not found. Run setup-linear-core.mjs first.`);
  }

  console.log(`Found team: ${team.name} (${team.key})`);

  printHeader(snapshot.viewer, isCheckOnly);

  const existingStateNames = new Set((team.states?.nodes ?? []).map((s) => s.name));
  const missingStates = WORKFLOW_STATES.filter((s) => !existingStateNames.has(s.name));

  const existingCycles = new Set((snapshot.cycles?.nodes ?? []).map((c) => c.name));
  const missingCycles = CYCLES.filter((c) => !existingCycles.has(c.name));

  console.log(`Existing workflow states: ${existingStateNames.size}`);
  console.log(`Missing workflow states to create: ${missingStates.length > 0 ? missingStates.map((s) => s.name).join(", ") : "none"}`);
  console.log(`Missing cycles to create: ${missingCycles.length > 0 ? missingCycles.map((c) => c.name).join(", ") : "none"}`);
  console.log("");

  if (isCheckOnly) {
    const needsChanges = missingStates.length > 0 || missingCycles.length > 0;
    console.log(`Check mode: ${needsChanges ? "changes needed" : "up to date"}`);
    process.exit(needsChanges ? 1 : 0);
  }

  for (const state of WORKFLOW_STATES) {
    if (existingStateNames.has(state.name)) {
      runSummary.reused.push(`workflow state ${state.name}`);
    } else {
      console.log(`Creating workflow state: ${state.name}`);
      const created = await createWorkflowState({
        ...state,
        teamId: team.id,
      });
      runSummary.created.push(`workflow state ${created.name}`);
    }
  }

  for (const cycle of CYCLES) {
    if (existingCycles.has(cycle.name)) {
      runSummary.reused.push(`cycle ${cycle.name}`);
    } else {
      console.log(`Creating cycle: ${cycle.name}`);
      const created = await createCycle({
        name: cycle.name,
        teamId: team.id,
        offsetWeeks: cycle.offsetWeeks,
      });
      runSummary.created.push(`cycle ${created.name}`);
    }
  }

  console.log("");
  console.log("Linear workflow states and cycles setup complete.");
  printRunSummary(runSummary);
}

function loadEnvFiles() {
  const shellEnvKeys = new Set(Object.keys(process.env));

  for (const envPath of getEnvPaths()) {
    loadEnvFile(envPath, shellEnvKeys);
  }
}

function getEnvPaths() {
  return [resolve(repoRoot, ".env"), resolve(repoRoot, ".env.local")];
}

function loadEnvFile(envPath, shellEnvKeys) {
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim().replace(/^export\s+/, "");
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!isValidEnvKey(key) || shellEnvKeys.has(key)) {
      continue;
    }

    process.env[key] = parseEnvValue(rawValue);
  }
}

function isValidEnvKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

function parseEnvValue(value) {
  if (!value) {
    return "";
  }

  if (value.startsWith('"') || value.startsWith("'")) {
    const quote = value[0];
    const closingQuoteIndex = value.indexOf(quote, 1);

    if (closingQuoteIndex !== -1) {
      return value.slice(1, closingQuoteIndex);
    }
  }

  return stripInlineComment(value).trim();
}

function stripInlineComment(value) {
  const commentIndex = value.search(/\s#/);

  if (commentIndex === -1) {
    return value;
  }

  return value.slice(0, commentIndex);
}

async function fetchWorkspaceSnapshot() {
  const data = await linearRequest(
    `
      query SetupLinearWorkflowCyclesSnapshot {
        viewer {
          id
          name
          email
        }
        teams {
          nodes {
            id
            name
            key
            states {
              nodes {
                id
                name
                color
                type
                description
              }
            }
          }
        }
        cycles {
          nodes {
            id
            name
            number
            team {
              id
              name
            }
          }
        }
      }
    `,
    {},
    "read workspace snapshot",
  );

  return {
    viewer: data.viewer,
    teams: data.teams?.nodes ?? [],
    cycles: data.cycles ?? { nodes: [] },
  };
}

function printHeader(viewer, checkOnly) {
  console.log(`Linear workspace: FitSculpt`);
  console.log(`Authenticated as: ${viewer.name} <${viewer.email}>`);
  console.log(checkOnly ? "Mode: check-only (no mutations)" : "Mode: apply");
  console.log("");
}

function createRunSummary() {
  return {
    created: [],
    reused: [],
    skipped: [],
    manualFollowUp: [],
  };
}

function printRunSummary(summary) {
  console.log("");
  console.log("Post-run summary:");
  console.log(`Created: ${summary.created.join(", ") || "none"}`);
  console.log(`Reused: ${summary.reused.join(", ") || "none"}`);
  console.log(`Skipped: ${summary.skipped.join(", ") || "none"}`);

  if (summary.manualFollowUp.length > 0) {
    console.log("Manual follow-up:");
    for (const step of summary.manualFollowUp) {
      console.log(`- ${step}`);
    }
  }
}

async function createWorkflowState(input) {
  const data = await linearRequest(
    `
      mutation WorkflowStateCreate($input: WorkflowStateCreateInput!) {
        workflowStateCreate(input: $input) {
          success
          workflowState {
            id
            name
            color
            type
            description
          }
        }
      }
    `,
    { input },
    `create workflow state ${input.name}`,
  );

  if (!data.workflowStateCreate?.success || !data.workflowStateCreate.workflowState) {
    fail(`Linear workflowStateCreate failed for state "${input.name}".`);
  }

  return data.workflowStateCreate.workflowState;
}

async function createCycle(input) {
  // Calculate cycle dates: each week starts on Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const cycleStart = new Date(now);
  cycleStart.setDate(now.getDate() + daysToMonday + (input.offsetWeeks * 7));
  cycleStart.setHours(0, 0, 0, 0);
  
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleStart.getDate() + 6);
  cycleEnd.setHours(23, 59, 59, 999);

  const startsAt = cycleStart.toISOString();
  const endsAt = cycleEnd.toISOString();

  const data = await linearRequest(
    `
      mutation CycleCreate($input: CycleCreateInput!) {
        cycleCreate(input: $input) {
          success
          cycle {
            id
            name
            startsAt
            endsAt
          }
        }
      }
    `,
    { input: { name: input.name, teamId: input.teamId, startsAt, endsAt } },
    `create cycle ${input.name}`,
  );

  if (!data.cycleCreate?.success || !data.cycleCreate.cycle) {
    fail(`Linear cycleCreate failed for cycle "${input.name}".`);
  }

  return data.cycleCreate.cycle;
}

async function linearRequest(query, variables, action) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: linearApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new LinearApiError(formatLinearFailure(action, response.status, body));
    }

    if (body.errors?.length) {
      const details = body.errors.map((error) => error.message).join("; ");
      throw new LinearApiError(`Linear API could not ${action}: ${details}`);
    }

    return body.data;
  } catch (error) {
    if (error instanceof LinearApiError) {
      throw error;
    }

    if (error?.name === "AbortError") {
      throw new LinearApiError(`Linear API request timed out while trying to ${action}.`);
    }

    throw new LinearApiError(`Linear API request failed while trying to ${action}: ${error?.message ?? String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function formatLinearFailure(action, status, body) {
  const details = body?.errors?.map((error) => error.message).join("; ") || body?.message || "No error body returned.";
  return `Linear API returned HTTP ${status} while trying to ${action}: ${details}`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}