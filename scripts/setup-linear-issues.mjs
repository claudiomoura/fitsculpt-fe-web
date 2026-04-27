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

const ISSUE_SPECS = [
  {
    project: "Beta Launch Readiness",
    cycle: "Beta Week 1",
    labels: ["Type/Task", "Priority/P0", "Function/Stability", "Source/Release Review"],
    issues: [
      { title: "Verify all dependencies working", description: "Run full dependency check, verify all packages install correctly, check for security vulnerabilities." },
      { title: "Final build verification", description: "Build both web and API, verify no build errors, check bundle sizes." },
      { title: "Pre-launch checklist complete", description: "Review and complete all items in the pre-launch checklist document." },
    ],
  },
  {
    project: "Activation and Onboarding",
    cycle: "Beta Week 1",
    labels: ["Type/Feature", "Priority/P1", "Function/Activation", "Source/Founder"],
    issues: [
      { title: "Test auth flow end-to-end", description: "Verify sign up, sign in, password reset, and session management work correctly." },
      { title: "Test billing flow end-to-end", description: "Verify subscription purchase, upgrade, downgrade, and cancellation flows." },
      { title: "Verify onboarding UX", description: "Test new user onboarding flow, verify all tooltips, guides, and first-run experiences work." },
    ],
  },
  {
    project: "Workout Core Experience",
    cycle: "Beta Week 1",
    labels: ["Type/Feature", "Priority/P1", "Function/Workout Core", "Source/Founder"],
    issues: [
      { title: "Test workout creation and execution", description: "Verify users can create custom workouts and execute them with proper tracking." },
      { title: "Test exercise library", description: "Verify exercise library loads, searches, and displays exercise details correctly." },
      { title: "Verify training tracking saves properly", description: "Verify completed workouts, sets, reps, and weights are persisted correctly." },
    ],
  },
  {
    project: "Stability and APK Distribution",
    cycle: "Beta Week 1",
    labels: ["Type/Task", "Priority/P0", "Function/Distribution", "Source/Release Review"],
    issues: [
      { title: "Build Android debug APK", description: "Build Android debug APK with proper signing and verify it installs correctly." },
      { title: "Test APK on device/emulator", description: "Install and test APK on physical device and/or emulator, verify all features work." },
      { title: "Fix any blocking issues found", description: "Address any critical issues discovered during APK testing." },
    ],
  },
  {
    project: "Week 1 Beta Feedback",
    cycle: "Beta Week 1",
    labels: ["Type/Feedback", "Priority/P2", "Function/Stability", "Source/Beta Feedback"],
    issues: [
      { title: "Review AI parsing quality", description: "Analyze AI exercise parsing accuracy from beta user inputs, identify patterns in failures." },
      { title: "Document AI improvements needed", description: "Document specific AI parsing issues and areas for improvement based on beta feedback." },
    ],
  },
  {
    project: "Operating System and Documentation",
    cycle: "Beta Week 1",
    labels: ["Type/Docs", "Priority/P2", "Function/Documentation", "Source/Founder"],
    issues: [
      { title: "Create user documentation", description: "Write user-facing documentation for all major features and workflows." },
      { title: "Create API documentation", description: "Document API endpoints, authentication, and integration requirements." },
    ],
  },
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

  const snapshot = await fetchWorkspaceSnapshot();
  const team = findCoreTeam(snapshot.teams);
  const projectIndex = indexProjects(snapshot.projects);
  const labelIndex = indexLabels(snapshot.labels);
  const cycleIndex = indexCycles(snapshot.cycles);
  const stateIndex = indexStates(snapshot.teams);

  printHeader(snapshot.viewer, isCheckOnly);
  printPlan(snapshot, team, projectIndex, labelIndex, cycleIndex, stateIndex);

  if (isCheckOnly) {
    process.exit(runSummary.needsChanges ? 1 : 0);
  }

  if (!team) {
    fail("Core team not found. Run setup-linear-core.mjs first.");
  }

  const inboxState = findInboxState(team, stateIndex);
  if (!inboxState) {
    fail("Inbox workflow state not found for Core team. Run setup-linear-workflow-cycles.mjs first.");
  }

  for (const projectSpec of ISSUE_SPECS) {
    const project = projectIndex.byName.get(projectSpec.project);
    if (!project) {
      warn(`Project not found: ${projectSpec.project}. Skipping its issues.`, runSummary);
      continue;
    }

    const cycle = cycleIndex.byName.get(projectSpec.cycle);
    if (!cycle) {
      warn(`Cycle not found: ${projectSpec.cycle}. Issues will be created without a cycle.`, runSummary);
    }

    for (const issueSpec of projectSpec.issues) {
      const existingIssue = findExistingIssue(snapshot.issues, project.id, issueSpec.title);
      if (existingIssue) {
        runSummary.reused.push(`issue "${issueSpec.title}" in ${projectSpec.project}`);
        continue;
      }

      const labelIds = resolveLabelIds(projectSpec.labels, labelIndex);
      const issueInput = {
        teamId: team.id,
        projectId: project.id,
        title: issueSpec.title,
        description: issueSpec.description,
        stateId: inboxState.id,
        labelIds,
        ...(cycle ? { cycleId: cycle.id } : {}),
      };

      console.log(`Creating issue: ${issueSpec.title} (${projectSpec.project})`);
      const issue = await createIssue(issueInput);
      snapshot.issues.push(issue);
      runSummary.created.push(`issue "${issue.title}" in ${projectSpec.project}`);
    }
  }

  console.log("");
  console.log("Linear issues setup complete.");
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
      query SetupLinearIssuesSnapshot {
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
                type
              }
            }
          }
        }
        projects {
          nodes {
            id
            name
            description
          }
        }
        issueLabels {
          nodes {
            id
            name
            color
            isGroup
            parent {
              id
              name
            }
            team {
              id
              name
            }
          }
        }
        cycles {
          nodes {
            id
            name
            team {
              id
              name
            }
          }
        }
        issues {
          nodes {
            id
            title
            project {
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
    projects: data.projects?.nodes ?? [],
    labels: data.issueLabels?.nodes ?? [],
    cycles: data.cycles?.nodes ?? [],
    issues: data.issues?.nodes ?? [],
  };
}

function findCoreTeam(teams) {
  return teams.find((team) => team.name === TEAM_NAME) ?? null;
}

function indexProjects(projects) {
  const byName = new Map();
  const byId = new Map();

  for (const project of projects) {
    byName.set(project.name, project);
    byId.set(project.id, project);
  }

  return { byName, byId };
}

function indexLabels(labels) {
  const byKey = new Map();
  const byName = new Map();

  for (const label of labels) {
    const key = labelKey(label.name, label.parent?.name ?? null);
    byKey.set(key, label);
    const nameKey = label.parent?.name ? `${label.parent.name}/${label.name}` : label.name;
    byName.set(nameKey, label);
  }

  return { byKey, byName };
}

function indexCycles(cycles) {
  const byName = new Map();
  const byId = new Map();

  for (const cycle of cycles) {
    byName.set(cycle.name, cycle);
    byId.set(cycle.id, cycle);
  }

  return { byName, byId };
}

function indexStates(states) {
  const statesFlat = [];
  for (const team of states) {
    for (const state of team.states?.nodes ?? []) {
      statesFlat.push({ ...state, teamId: team.id, teamName: team.name });
    }
  }
  return { all: statesFlat };
}

function findInboxState(team, stateIndex) {
  for (const state of stateIndex.all) {
    if (state.teamId === team.id && state.name === "Inbox") {
      return state;
    }
  }
  return null;
}

function resolveLabelIds(labelNames, labelIndex) {
  const ids = [];

  for (const name of labelNames) {
    const label = labelIndex.byName.get(name);
    if (label) {
      ids.push(label.id);
    } else {
      warn(`Label not found: ${name}`, runSummary);
    }
  }

  return ids;
}

function findExistingIssue(issues, projectId, title) {
  for (const issue of issues) {
    if (issue.project?.id === projectId && issue.title === title) {
      return issue;
    }
  }
  return null;
}

function printHeader(viewer, checkOnly) {
  console.log(`Linear workspace: FitSculpt`);
  console.log(`Authenticated as: ${viewer.name} <${viewer.email}>`);
  console.log(checkOnly ? "Mode: check-only (no mutations)" : "Mode: apply");
  console.log("");
}

function printPlan(snapshot, team, projectIndex, labelIndex, cycleIndex, stateIndex) {
  console.log(`Core team: ${team ? `${team.name} (${team.key})` : "missing"}`);
  console.log(`Projects: ${projectIndex.byName.size}`);
  console.log(`Labels: ${labelIndex.byName.size}`);
  console.log(`Cycles: ${cycleIndex.byName.size}`);
  console.log(`Existing issues: ${snapshot.issues.length}`);
  console.log("");

  const missingProjects = ISSUE_SPECS.filter((spec) => !projectIndex.byName.has(spec.project)).map((spec) => spec.project);
  const missingCycles = [...new Set(ISSUE_SPECS.map((spec) => spec.cycle))].filter((name) => !cycleIndex.byName.has(name));

  if (missingProjects.length > 0) {
    console.log(`Missing projects: ${missingProjects.join(", ")}`);
  }
  if (missingCycles.length > 0) {
    console.log(`Missing cycles: ${missingCycles.join(", ")} (issues will be created without a cycle)`);
  }
  console.log("");
  console.log("Issues to create:");
  for (const spec of ISSUE_SPECS) {
    console.log(`  ${spec.project}:`);
    for (const issue of spec.issues) {
      console.log(`    - ${issue.title}`);
    }
  }
}

function createRunSummary() {
  return {
    created: [],
    reused: [],
    skipped: [],
    manualFollowUp: [],
    needsChanges: true,
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

function labelKey(name, parentName) {
  return `${parentName ?? "workspace"}::${name}`;
}

function warn(message, summary) {
  console.warn(message);
  summary.manualFollowUp.push(message);
}

async function createIssue(input) {
  const data = await linearRequest(
    `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            title
            project {
              id
              name
            }
          }
        }
      }
    `,
    { input },
    `create issue "${input.title}"`,
  );

  if (!data.issueCreate?.success || !data.issueCreate.issue) {
    fail(`Linear issueCreate failed for issue "${input.title}".`);
  }

  return data.issueCreate.issue;
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