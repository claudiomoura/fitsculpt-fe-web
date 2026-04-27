import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const REQUEST_TIMEOUT_MS = 30000;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const isCheckOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");

const TEAM_SPEC = {
  name: "Core",
  key: "CORE",
  description: "FitSculpt core execution team for product, release, and beta operations.",
};

const DESIRED_WORKFLOW_STATES = [
  "Inbox",
  "Planned",
  "In Progress",
  "Blocked",
  "In Review",
  "Ready for Release",
  "Done",
  "Canceled",
];

const PROJECT_SPECS = [
  {
    name: "Beta Launch Readiness",
    description: "Track release-critical work and go/no-go readiness for the current FitSculpt beta.",
  },
  {
    name: "Activation and Onboarding",
    description: "Improve user activation, onboarding clarity, and first-session success.",
  },
  {
    name: "Workout Core Experience",
    description: "Improve the core workout flow, usefulness, and perceived completeness.",
  },
  {
    name: "Stability and APK Distribution",
    description: "Track app stability, Android packaging, distribution, and install reliability.",
  },
  {
    name: "Week 1 Beta Feedback",
    description: "Capture and execute against the first week of beta feedback and triage outcomes.",
  },
  {
    name: "Operating System and Documentation",
    description: "Maintain operating rules, release process, and execution-system documentation.",
  },
];

const LABEL_SPECS = [
  {
    name: "Type",
    color: "#8B5CF6",
    description: "Classifies the kind of work.",
    children: [
      { name: "Bug", color: "#E5484D", description: "Defect or regression." },
      { name: "Feature", color: "#3B82F6", description: "New user-facing capability." },
      { name: "Task", color: "#6366F1", description: "Execution task without a distinct feature scope." },
      { name: "Docs", color: "#06B6D4", description: "Documentation or operating-system update." },
      { name: "Feedback", color: "#10B981", description: "Work created from user or founder feedback." },
      { name: "Release", color: "#F59E0B", description: "Release readiness or distribution work." },
    ],
  },
  {
    name: "Priority",
    color: "#F97316",
    description: "Relative execution priority.",
    children: [
      { name: "P0", color: "#B91C1C", description: "Immediate, business-critical work." },
      { name: "P1", color: "#DC2626", description: "High-priority work for the active beta window." },
      { name: "P2", color: "#F97316", description: "Important but not urgent work." },
      { name: "P3", color: "#FBBF24", description: "Lower-priority or opportunistic work." },
    ],
  },
  {
    name: "Severity",
    color: "#EF4444",
    description: "Impact severity for bugs or incidents.",
    children: [
      { name: "Sev 0", color: "#7F1D1D", description: "Launch-blocking or user-stopping failure." },
      { name: "Sev 1", color: "#B91C1C", description: "Severe breakage with major user impact." },
      { name: "Sev 2", color: "#DC2626", description: "Meaningful issue with a workaround or partial impact." },
      { name: "Sev 3", color: "#F97316", description: "Minor issue or polish-level defect." },
    ],
  },
  {
    name: "Function",
    color: "#14B8A6",
    description: "Product or operating area affected.",
    children: [
      { name: "Activation", color: "#14B8A6", description: "Activation and onboarding work." },
      { name: "Workout Core", color: "#0EA5E9", description: "Core workout or training experience work." },
      { name: "Stability", color: "#64748B", description: "Reliability, bugs, and operational hardening." },
      { name: "Distribution", color: "#F59E0B", description: "APK delivery, installs, and release operations." },
      { name: "Documentation", color: "#22C55E", description: "Operating system and documentation work." },
    ],
  },
  {
    name: "Source",
    color: "#A855F7",
    description: "Where the work came from.",
    children: [
      { name: "Founder", color: "#7C3AED", description: "Founder-directed work." },
      { name: "Beta Feedback", color: "#8B5CF6", description: "User beta feedback or triage output." },
      { name: "Release Review", color: "#C084FC", description: "Release checklist or QA review follow-up." },
      { name: "Docs", color: "#D946EF", description: "Documentation-driven follow-up." },
      { name: "HQ Chat", color: "#A855F7", description: "Work captured from operating chat direction." },
    ],
  },
  {
    name: "Platform",
    color: "#0F766E",
    description: "Primary platform affected.",
    children: [
      { name: "Android", color: "#16A34A", description: "Android app or APK work." },
      { name: "Web", color: "#2563EB", description: "Web client work." },
      { name: "API", color: "#475569", description: "Backend or API work." },
      { name: "Cross-Platform", color: "#0891B2", description: "Work spanning more than one platform." },
    ],
  },
  {
    name: "Decision",
    color: "#6D28D9",
    description: "Decision-related execution flags.",
    children: [
      { name: "Founder Decision Needed", color: "#6D28D9", description: "Cannot proceed without a founder call." },
      { name: "Blocked by Decision", color: "#7C3AED", description: "Execution is blocked pending a decision." },
      { name: "Clarify Scope", color: "#8B5CF6", description: "Needs clarification before implementation." },
    ],
  },
];

loadEnvFiles();

const linearApiKey = process.env.LINEAR_API_KEY;

if (!linearApiKey) {
  fail("Missing LINEAR_API_KEY. Add it to the repo root .env.local or export it in your shell before running this script.");
}

if (typeof fetch !== "function") {
  fail("This script requires Node.js with global fetch support. Use Node.js 18 or newer.");
}

const snapshot = await fetchWorkspaceSnapshot();
const currentTeam = findCoreTeam(snapshot.teams);
const initialPlan = buildPlan(snapshot, currentTeam);

printHeader(snapshot.viewer, isCheckOnly);
printPlan(initialPlan, currentTeam, snapshot.teams);

if (isCheckOnly) {
  process.exit(initialPlan.needsChanges ? 1 : 0);
}

let team = currentTeam;

if (!team) {
  console.log(`Creating missing team: ${TEAM_SPEC.name}`);
  team = await createTeam(TEAM_SPEC);
}

const labelsByKey = indexLabels(snapshot.labels);

for (const labelSpec of LABEL_SPECS) {
  await ensureLabelGroup(labelSpec, labelsByKey);
}

for (const projectSpec of PROJECT_SPECS) {
  if (!snapshot.projects.some((project) => project.name === projectSpec.name)) {
    console.log(`Creating project: ${projectSpec.name}`);
    const project = await createProject(projectSpec);
    snapshot.projects.push(project);
  }
}

const finalSnapshot = await fetchWorkspaceSnapshot();
const finalTeam = findCoreTeam(finalSnapshot.teams);
const finalPlan = buildPlan(finalSnapshot, finalTeam);

console.log("");
console.log("Linear Core setup complete.");
printPlan(finalPlan, finalTeam, finalSnapshot.teams);

function loadEnvFiles() {
  const shellEnvKeys = new Set(Object.keys(process.env));

  for (const envPath of getEnvPaths()) {
    loadEnvFile(envPath, shellEnvKeys);
  }
}

function getEnvPaths() {
  const paths = [];

  for (const directory of [repoRoot, process.cwd()]) {
    for (const fileName of [".env", ".env.local"]) {
      const envPath = resolve(directory, fileName);

      if (!paths.includes(envPath)) {
        paths.push(envPath);
      }
    }
  }

  return paths;
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
      query SetupLinearCoreSnapshot {
        viewer {
          id
          name
          email
          organization {
            id
            name
          }
        }
        teams(first: 100) {
          nodes {
            id
            name
            key
            states(first: 50) {
              nodes {
                id
                name
                type
              }
            }
          }
        }
        projects(first: 100) {
          nodes {
            id
            name
            description
          }
        }
        issueLabels(first: 250) {
          nodes {
            id
            name
            color
            description
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
  };
}

function findCoreTeam(teams) {
  return teams.find((team) => team.name === TEAM_SPEC.name || team.key === TEAM_SPEC.key) ?? null;
}

function buildPlan(snapshot, team) {
  const existingStateNames = new Set((team?.states?.nodes ?? []).map((state) => state.name));
  const missingWorkflowStates = DESIRED_WORKFLOW_STATES.filter((name) => !existingStateNames.has(name));

  const labelsByKey = indexLabels(snapshot.labels);
  const missingLabelGroups = [];
  const missingLabels = [];

  for (const labelGroup of LABEL_SPECS) {
    if (!labelsByKey.has(labelKey(labelGroup.name, null))) {
      missingLabelGroups.push(labelGroup.name);
    }

    for (const child of labelGroup.children) {
      if (!labelsByKey.has(labelKey(child.name, labelGroup.name))) {
        missingLabels.push(`${labelGroup.name} / ${child.name}`);
      }
    }
  }

  const existingProjectNames = new Set(snapshot.projects.map((project) => project.name));
  const missingProjects = PROJECT_SPECS.map((project) => project.name).filter((name) => !existingProjectNames.has(name));

  return {
    missingTeam: !team,
    missingProjects,
    missingLabelGroups,
    missingLabels,
    missingWorkflowStates,
    manualSteps: buildManualSteps(team, missingWorkflowStates),
    needsChanges: !team || missingProjects.length > 0 || missingLabelGroups.length > 0 || missingLabels.length > 0,
  };
}

function buildManualSteps(team, missingWorkflowStates) {
  const steps = [];

  if (!team) {
    steps.push("Workflow-state alignment cannot be evaluated until the Core team exists.");
  } else if (missingWorkflowStates.length > 0) {
    steps.push(`Align Core workflow states manually. Missing desired states: ${missingWorkflowStates.join(", ")}.`);
  }

  steps.push("Create or align issue templates manually using docs/linear-issue-templates.md. Template automation is intentionally out of scope for this first-pass script.");
  steps.push("Create or rename cycles manually for Beta Week 1 through Beta Week 4 if the workspace will use Linear cycles.");

  return steps;
}

function printHeader(viewer, checkOnly) {
  console.log(`Linear workspace: ${viewer.organization?.name ?? "Unknown workspace"}`);
  console.log(`Authenticated as: ${viewer.name} <${viewer.email}>`);
  console.log(checkOnly ? "Mode: check-only (no mutations)" : "Mode: apply");
  console.log("");
}

function printPlan(plan, team, teams) {
  console.log(`Core team: ${team ? `${team.name} (${team.key})` : "missing"}`);
  console.log(`Existing teams: ${teams.map((existingTeam) => `${existingTeam.name} (${existingTeam.key})`).join(", ") || "none"}`);
  console.log(`Missing label groups: ${plan.missingLabelGroups.join(", ") || "none"}`);
  console.log(`Missing labels: ${plan.missingLabels.join(", ") || "none"}`);
  console.log(`Missing projects: ${plan.missingProjects.join(", ") || "none"}`);
  console.log(`Missing desired workflow states: ${plan.missingWorkflowStates.join(", ") || "none"}`);
  console.log("");
  console.log("Manual follow-up:");

  for (const step of plan.manualSteps) {
    console.log(`- ${step}`);
  }
}

async function ensureLabelGroup(groupSpec, labelsByKey) {
  let parent = labelsByKey.get(labelKey(groupSpec.name, null));

  if (!parent) {
    console.log(`Creating label group: ${groupSpec.name}`);
    parent = await createLabel({
      name: groupSpec.name,
      color: groupSpec.color,
      description: groupSpec.description,
      isGroup: true,
    });
    labelsByKey.set(labelKey(groupSpec.name, null), parent);
  }

  for (const childSpec of groupSpec.children) {
    const key = labelKey(childSpec.name, groupSpec.name);

    if (labelsByKey.has(key)) {
      continue;
    }

    console.log(`Creating label: ${groupSpec.name} / ${childSpec.name}`);
    const label = await createLabel({
      name: childSpec.name,
      color: childSpec.color,
      description: childSpec.description,
      parentId: parent.id,
    });
    labelsByKey.set(key, label);
  }
}

function indexLabels(labels) {
  const map = new Map();

  for (const label of labels) {
    if (label.team) {
      continue;
    }

    map.set(labelKey(label.name, label.parent?.name ?? null), label);
  }

  return map;
}

function labelKey(name, parentName) {
  return `${parentName ?? "workspace"}::${name}`;
}

async function createTeam(input) {
  const data = await linearRequest(
    `
      mutation TeamCreate($input: TeamCreateInput!) {
        teamCreate(input: $input) {
          success
          team {
            id
            name
            key
          }
        }
      }
    `,
    { input },
    "create Core team",
  );

  if (!data.teamCreate?.success || !data.teamCreate.team) {
    fail("Linear teamCreate did not return a team. Check workspace permissions and existing team configuration.");
  }

  return data.teamCreate.team;
}

async function createLabel(input) {
  const data = await linearRequest(
    `
      mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            id
            name
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
      }
    `,
    { input },
    `create label ${input.name}`,
  );

  if (!data.issueLabelCreate?.success || !data.issueLabelCreate.issueLabel) {
    fail(`Linear issueLabelCreate failed for label \"${input.name}\".`);
  }

  return data.issueLabelCreate.issueLabel;
}

async function createProject(input) {
  const data = await linearRequest(
    `
      mutation ProjectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project {
            id
            name
            description
          }
        }
      }
    `,
    { input },
    `create project ${input.name}`,
  );

  if (!data.projectCreate?.success || !data.projectCreate.project) {
    fail(`Linear projectCreate failed for project \"${input.name}\".`);
  }

  return data.projectCreate.project;
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
      fail(formatLinearFailure(action, response.status, body));
    }

    if (body.errors?.length) {
      const details = body.errors.map((error) => error.message).join("; ");
      fail(`Linear API could not ${action}: ${details}`);
    }

    return body.data;
  } catch (error) {
    if (error?.name === "AbortError") {
      fail(`Linear API request timed out while trying to ${action}.`);
    }

    fail(`Linear API request failed while trying to ${action}: ${error?.message ?? String(error)}`);
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
