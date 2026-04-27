import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_VERSION = "2022-06-28";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const isCheckOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");

const pages = [
  {
    title: "Home",
    bullets: [
      "Command center for the FitSculpt AI Company OS.",
      "Start here for current priorities, active decisions, and operating links.",
      "Founder remains the final decision-maker; AI agents support execution.",
    ],
  },
  {
    title: "Company",
    bullets: [
      "Mission, positioning, principles, and company context.",
      "Use this page for durable company-level context, not transient task tracking.",
      "Keep source-of-truth rules aligned with GitHub /docs and founder decisions.",
    ],
  },
  {
    title: "Product",
    bullets: [
      "Product strategy, beta scope, user feedback themes, and roadmap notes.",
      "Focus on usefulness, clarity, completeness, and mobile-first Android beta readiness.",
      "Link product decisions back to decision records where possible.",
    ],
  },
  {
    title: "Operating Cadence",
    bullets: [
      "Daily direction flows through HQ chat and active execution systems.",
      "Weekly review captures priorities, blockers, decisions, and next moves.",
      "Release readiness uses documented gates and runbooks before beta drops.",
    ],
  },
  {
    title: "Decisions",
    bullets: [
      "Decision inbox and index for founder-level choices.",
      "Record context, options considered, final call, owner, and review date when useful.",
      "Durable policy decisions should also be reflected in GitHub /docs.",
    ],
  },
  {
    title: "Meetings",
    bullets: [
      "Meeting notes, founder reviews, weekly reviews, and async check-ins.",
      "Capture outcomes, decisions, action items, and unresolved questions.",
      "Avoid duplicating Linear task tracking; link to execution artifacts instead.",
    ],
  },
  {
    title: "Links",
    bullets: [
      "Quick access to GitHub docs, Linear, releases, audits, and key dashboards.",
      "Keep this page intentionally short and operational.",
      "Do not store API keys, tokens, credentials, or secrets here.",
    ],
  },
];

loadEnvFiles();

const notionApiKey = process.env.NOTION_API_KEY;
const parentPageId = normalizePageId(process.env.NOTION_PARENT_PAGE_ID);

if (!notionApiKey) {
  fail("Missing NOTION_API_KEY. Add it to the repo root .env.local or export it in your shell before running this script.");
}

if (!parentPageId) {
  fail(
    "Missing NOTION_PARENT_PAGE_ID. Add it to the repo root .env.local or export it in your shell.",
  );
}

if (!isValidPageId(parentPageId)) {
  fail("Invalid NOTION_PARENT_PAGE_ID. Use a 32-character Notion page id with or without hyphens.");
}

if (isCheckOnly) {
  console.log("Notion HQ setup check passed. Required environment is present and no API call was made.");
  process.exit(0);
}

if (typeof fetch !== "function") {
  fail("This script requires Node.js with global fetch support. Use Node.js 18 or newer.");
}

console.log(`Creating ${pages.length} FitSculpt HQ pages in Notion parent ${parentPageId}...`);

for (const page of pages) {
  const created = await createChildPage(parentPageId, page);
  console.log(`Created: ${page.title} (${created.url})`);
}

console.log("Notion HQ setup complete.");

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

function normalizePageId(value) {
  if (!value) return "";
  // Remove hyphens and take first 32 chars (Notion page IDs are 32 chars)
  return value.trim().replaceAll("-", "").slice(0, 32);
}

function isValidPageId(value) {
  return /^[0-9a-f]{32}$/i.test(value ?? "");
}

async function createChildPage(parentId, page) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: page.title,
              },
            },
          ],
        },
      },
      children: [
        paragraph(`${page.title} for the FitSculpt AI Company OS.`),
        ...page.bullets.map((bullet) => bulletedListItem(bullet)),
      ],
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    handleNotionError(response.status, body);
  }

  return body;
}

function paragraph(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  };
}

function bulletedListItem(content) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content } }],
    },
  };
}

function handleNotionError(status, body) {
  const message = body?.message ? ` Notion said: ${body.message}` : "";

  if (status === 403) {
    fail(
      `Notion API returned 403. The integration is likely not shared with the parent page, or the token lacks access.${message}`,
    );
  }

  fail(`Notion API request failed with HTTP ${status}.${message}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
