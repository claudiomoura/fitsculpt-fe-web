import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const REQUEST_TIMEOUT_MS = 15000;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

loadEnvFiles();

const linearApiKey = process.env.LINEAR_API_KEY;

if (!linearApiKey) {
  console.error("ERROR: LINEAR_API_KEY not found. Check .env or .env.local");
  process.exit(1);
}

console.log("=== Linear API Debug Script ===\n");
console.log(`API Key: ${linearApiKey.substring(0, 8)}...${linearApiKey.substring(linearApiKey.length - 4)}`);

await runTests();

async function runTests() {
  const tests = [
    { name: "viewer + organization", query: `query { viewer { id name email organization { id name } } }` },
    { name: "teams (no first)", query: `query { teams { nodes { id name key } } }` },
    { name: "teams (first: 100)", query: `query { teams(first: 100) { nodes { id name key } } }` },
    { name: "projects (no first)", query: `query { projects { nodes { id name description } } }` },
    { name: "projects (first: 100)", query: `query { projects(first: 100) { nodes { id name description } } }` },
    { name: "issueLabels (no first)", query: `query { issueLabels { nodes { id name color } } }` },
    { name: "issueLabels (first: 500)", query: `query { issueLabels(first: 500) { nodes { id name color } } }` },
    { name: "teams with states (first: 50) - BROKEN", query: `query { teams(first: 100) { nodes { id name key states(first: 50) { nodes { id name type } } } } }` },
    { name: "teams with states (no first) - FIXED", query: `query { teams(first: 100) { nodes { id name key states { nodes { id name type } } } } }` },
    { name: "FULL snapshot query", query: `
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
        issueLabels(first: 500) {
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
    ` },
  ];

  for (const test of tests) {
    console.log(`\n--- Test: ${test.name} ---`);
    try {
      const result = await linearRequest(test.query);
      if (result.errors) {
        console.log("ERRORS:", JSON.stringify(result.errors, null, 2));
      } else {
        console.log("SUCCESS - response has keys:", Object.keys(result.data || {}).join(", "));
      }
    } catch (error) {
      console.log("EXCEPTION:", error.message);
    }
  }

  console.log("\n=== Debug Complete ===");
}

async function linearRequest(query) {
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
      body: JSON.stringify({ query, variables: {} }),
    });

    const body = await response.json();
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function loadEnvFiles() {
  const shellEnvKeys = new Set(Object.keys(process.env));
  const envPaths = [
    resolve(repoRoot, ".env"),
    resolve(repoRoot, ".env.local"),
  ];

  for (const envPath of envPaths) {
    loadEnvFile(envPath, shellEnvKeys);
  }
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