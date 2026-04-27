import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_VERSION = "2022-06-28";
const SYNC_BLOCK_TITLE = "FitSculpt HQ synced content";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const isCheckOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");

const pageSpecs = [
  {
    title: "Home",
    legacyTexts: [
      "Home for the FitSculpt AI Company OS.",
      "Command center for the FitSculpt AI Company OS.",
      "Start here for current priorities, active decisions, and operating links.",
      "Founder remains the final decision-maker; AI agents support execution.",
    ],
    buildBlocks: () => [
      paragraph(
        "Operational front door for the founder during the current beta: what matters now, where the source of truth lives, and which decisions need attention next.",
      ),
      heading2("Current Operating Context"),
      bulletedListItem("FitSculpt is operating as an AI-first company with one human decision-maker: the founder."),
      bulletedListItem("Current beta is free, 4 weeks, mobile-first, and distributed as an Android APK."),
      bulletedListItem("Validation focus remains usefulness, clarity, and completeness rather than scale."),
      heading2("Source Of Truth"),
      bulletedListItem("GitHub /docs: canonical written operating rules, policies, templates, and decision records."),
      bulletedListItem("Linear: active execution, priorities, and current work status."),
      bulletedListItem("HQ chat: daily direction, clarification, and command flow."),
      bulletedListItem("Persistent memory: continuity, non-obvious context, and durable lessons from execution."),
      heading2("Founder Weekly Scan"),
      toDo("Confirm the top 1-3 priorities for the current beta week.", false),
      toDo("Review unresolved founder decisions and convert approved actions into Linear work.", false),
      toDo("Check whether any operating docs or release criteria changed and need GitHub updates.", false),
      heading2("Use This Page For"),
      bulletedListItem("Fast re-orientation at the start of a session."),
      bulletedListItem("Current company-level priorities and decision prompts."),
      bulletedListItem("Pointers into Company, Product, Operating Cadence, Decisions, Meetings, and Links."),
    ],
  },
  {
    title: "Company",
    legacyTexts: [
      "Company for the FitSculpt AI Company OS.",
      "Mission, positioning, principles, and company context.",
      "Use this page for durable company-level context, not transient task tracking.",
      "Keep source-of-truth rules aligned with GitHub /docs and founder decisions.",
    ],
    buildBlocks: () => [
      paragraph("Durable company context for how FitSculpt is meant to operate while still lean, founder-led, and AI-augmented."),
      heading2("Operating Model"),
      bulletedListItem("One human decision-maker: the founder."),
      bulletedListItem("AI handles orchestration, drafting, analysis, coordination, and execution support."),
      bulletedListItem("Written policy belongs in GitHub /docs; Notion should stay operational and easy to scan."),
      heading2("Current Constraints"),
      bulletedListItem("Beta context is intentionally bounded: free, 4 weeks, and mobile-first Android APK distribution."),
      bulletedListItem("The current goal is validation quality, not broad scale or enterprise readiness."),
      bulletedListItem("Long-term org chart, paid tooling stack, and post-beta cadence are still undecided."),
      heading2("Decision Rights"),
      bulletedListItem("Founder decides on product direction, scope, launch, release, and operating model changes."),
      bulletedListItem("AI agents should escalate anything material, ambiguous, or meaningfully user-facing."),
      heading2("Keep Updated When"),
      toDo("The company operating system changes.", false),
      toDo("Decision rights or source-of-truth rules change.", false),
      toDo("A durable constraint becomes fixed or intentionally undecided items become decided.", false),
    ],
  },
  {
    title: "Product",
    legacyTexts: [
      "Product for the FitSculpt AI Company OS.",
      "Product strategy, beta scope, user feedback themes, and roadmap notes.",
      "Focus on usefulness, clarity, completeness, and mobile-first Android beta readiness.",
      "Link product decisions back to decision records where possible.",
    ],
    buildBlocks: () => [
      paragraph("Founder-usable summary of what the beta is for, what is in scope, and what kinds of product changes deserve immediate attention."),
      heading2("Beta Thesis"),
      bulletedListItem("Validate whether users find FitSculpt useful."),
      bulletedListItem("Validate whether the product is clear enough to understand without heavy explanation."),
      bulletedListItem("Validate whether the experience feels complete enough to keep using."),
      heading2("In Scope"),
      bulletedListItem("Mobile-first experience improvements."),
      bulletedListItem("Android APK distribution and release readiness."),
      bulletedListItem("Changes driven by real confusion, friction, or missing pieces from early users."),
      heading2("Out Of Scope Unless Founder Approves"),
      bulletedListItem("Large-scale acquisition or paid conversion experiments."),
      bulletedListItem("Enterprise readiness or broad market segmentation."),
      bulletedListItem("Feature expansion that does not support usefulness, clarity, or completeness learning."),
      heading2("Scope Change Questions"),
      numberedListItem("Does this help validate usefulness, clarity, or completeness?"),
      numberedListItem("Is it required for the Android beta experience?"),
      numberedListItem("Is it reversible?"),
      numberedListItem("What gets deprioritized if this is added?"),
      heading2("Signals To Review Weekly"),
      toDo("Usefulness signal from direct user feedback.", false),
      toDo("Clarity signal from confusion, support load, or onboarding friction.", false),
      toDo("Completeness signal from missing workflows or broken expectations.", false),
    ],
  },
  {
    title: "Operating Cadence",
    legacyTexts: [
      "Operating Cadence for the FitSculpt AI Company OS.",
      "Daily direction flows through HQ chat and active execution systems.",
      "Weekly review captures priorities, blockers, decisions, and next moves.",
      "Release readiness uses documented gates and runbooks before beta drops.",
    ],
    buildBlocks: () => [
      paragraph("Default rhythm for running FitSculpt during beta without creating unnecessary meeting overhead or fragmented systems."),
      heading2("Daily"),
      bulletedListItem("Use HQ chat for direction, prioritization, and ambiguity resolution."),
      bulletedListItem("Keep active execution and status current in Linear."),
      bulletedListItem("Capture durable discoveries and decisions in docs or memory before context is lost."),
      heading2("Weekly"),
      bulletedListItem("Run a weekly review focused on what happened, what was learned, what changed, and what matters next."),
      bulletedListItem("Translate approved follow-up work into Linear issues or updates."),
      bulletedListItem("Update docs immediately when the operating model or standing rules change."),
      heading2("Before A Beta Drop"),
      numberedListItem("Run release readiness checks and smoke tests."),
      numberedListItem("Confirm no known blocker remains for the target beta users."),
      numberedListItem("Make the founder go or no-go decision explicit."),
      heading2("Default Cadence Checklist"),
      toDo("Weekly review completed or explicitly deferred by the founder.", false),
      toDo("Decision log updated for meaningful new standing decisions.", false),
      toDo("Session handoff captured if execution pauses mid-stream.", false),
    ],
  },
  {
    title: "Decisions",
    legacyTexts: [
      "Decisions for the FitSculpt AI Company OS.",
      "Decision inbox and index for founder-level choices.",
      "Record context, options considered, final call, owner, and review date when useful.",
      "Durable policy decisions should also be reflected in GitHub /docs.",
    ],
    buildBlocks: () => [
      paragraph("Operational inbox for founder decisions. Durable accepted decisions still belong in GitHub /docs/decision-log.md."),
      heading2("When To Put Something Here"),
      bulletedListItem("The decision changes product or beta scope."),
      bulletedListItem("The decision changes workflow, tooling, or release criteria."),
      bulletedListItem("The decision resolves a recurring ambiguity or creates a standing rule."),
      heading2("Decision Template"),
      paragraph("Title"),
      bulletedListItem("Status: Proposed / Accepted / Replaced / Reversed"),
      bulletedListItem("Owner: Founder"),
      bulletedListItem("Area: Product / Beta / Ops / Workflow / Tooling / Release"),
      bulletedListItem("Decision: one short paragraph"),
      bulletedListItem("Why: reasons the call is being made now"),
      bulletedListItem("Impact: what changes immediately"),
      bulletedListItem("Follow-up: docs to update and Linear work to create or adjust"),
      heading2("Current Standing Decisions"),
      numberedListItem("GitHub /docs is the canonical written source."),
      numberedListItem("Linear is the execution system."),
      numberedListItem("The beta is a free 4-week mobile-first Android APK validation period."),
    ],
  },
  {
    title: "Meetings",
    legacyTexts: [
      "Meetings for the FitSculpt AI Company OS.",
      "Meeting notes, founder reviews, weekly reviews, and async check-ins.",
      "Capture outcomes, decisions, action items, and unresolved questions.",
      "Avoid duplicating Linear task tracking; link to execution artifacts instead.",
    ],
    buildBlocks: () => [
      paragraph("Lightweight meeting and review operating page. Keep notes outcome-oriented and avoid turning this into a second task tracker."),
      heading2("Default Meeting Types"),
      bulletedListItem("Founder weekly review."),
      bulletedListItem("Async product or release review."),
      bulletedListItem("Decision-focused sync when a founder call is needed."),
      heading2("Every Note Should Capture"),
      bulletedListItem("What happened."),
      bulletedListItem("What was decided."),
      bulletedListItem("What action items move into Linear."),
      bulletedListItem("What remains unresolved."),
      heading2("Weekly Review Template"),
      bulletedListItem("Summary"),
      bulletedListItem("What happened"),
      bulletedListItem("What we learned"),
      bulletedListItem("Beta signal: usefulness / clarity / completeness"),
      bulletedListItem("Problems"),
      bulletedListItem("Decisions needed"),
      bulletedListItem("Next week priorities"),
      heading2("Rules"),
      toDo("Keep notes short and scannable.", false),
      toDo("Link execution follow-up into Linear instead of duplicating task boards here.", false),
      toDo("Update docs or the decision log if the meeting changes a standing rule.", false),
    ],
  },
  {
    title: "Links",
    legacyTexts: [
      "Links for the FitSculpt AI Company OS.",
      "Quick access to GitHub docs, Linear, releases, audits, and key dashboards.",
      "Keep this page intentionally short and operational.",
      "Do not store API keys, tokens, credentials, or secrets here.",
    ],
    buildBlocks: () => [
      paragraph("Operational index page. Keep this short, current, and free of secrets."),
      heading2("Core Systems"),
      bulletedListItem("GitHub repository and /docs directory"),
      bulletedListItem("Linear workspace"),
      bulletedListItem("HQ chat entrypoint"),
      heading2("Beta Operations"),
      bulletedListItem("Latest Android APK distribution link"),
      bulletedListItem("Release checklist and release gate docs"),
      bulletedListItem("Feedback operating model and beta scope docs"),
      heading2("Founder Setup Checklist"),
      toDo("Add the canonical GitHub repository URL.", false),
      toDo("Add the Linear workspace URL.", false),
      toDo("Add the latest beta distribution link when available.", false),
      heading2("Security Rule"),
      paragraph("Never store API keys, tokens, credentials, or other secrets in Notion."),
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
  console.log(`Notion HQ sync check passed for ${pageSpecs.length} pages. Required environment is present and no API call was made.`);
  process.exit(0);
}

if (typeof fetch !== "function") {
  fail("This script requires Node.js with global fetch support. Use Node.js 18 or newer.");
}

console.log(`Syncing ${pageSpecs.length} FitSculpt HQ pages under the configured parent page...`);

const childPages = await getChildPagesByTitle(parentPageId);

for (const spec of pageSpecs) {
  const page = childPages.get(spec.title) ?? (await createChildPage(parentPageId, spec.title));
  const syncResult = await syncManagedSection(page.id, spec);
  const action = childPages.has(spec.title) ? "Updated" : "Created";

  console.log(`${action}: ${spec.title} (${page.url}) [removed ${syncResult.removedLegacyCount} legacy blocks, replaced ${syncResult.removedManagedCount} managed block(s)]`);
}

console.log("Notion HQ sync complete.");

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
  return value.trim().replaceAll("-", "").slice(0, 32);
}

function isValidPageId(value) {
  return /^[0-9a-f]{32}$/i.test(value ?? "");
}

async function getChildPagesByTitle(parentId) {
  const blocks = await listBlockChildren(parentId);
  const pagesByTitle = new Map();

  for (const block of blocks) {
    if (block.type !== "child_page" || !block.child_page?.title) {
      continue;
    }

    const title = block.child_page.title.trim();

    if (!pagesByTitle.has(title)) {
      pagesByTitle.set(title, { id: block.id, url: `https://www.notion.so/${block.id.replaceAll("-", "")}` });
    }
  }

  return pagesByTitle;
}

async function createChildPage(parentId, title) {
  return notionRequest("/pages", {
    method: "POST",
    body: {
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
      },
    },
  });
}

async function syncManagedSection(pageId, spec) {
  const existingBlocks = await listBlockChildren(pageId);
  const managedBlocks = existingBlocks.filter(isManagedSyncBlock);
  const legacyBlocks = existingBlocks.filter((block) => spec.legacyTexts.includes(readPlainText(block)));

  for (const block of [...managedBlocks, ...legacyBlocks]) {
    await archiveBlock(block.id);
  }

  await appendBlockChildren(pageId, [buildManagedToggle(spec)]);

  return {
    removedManagedCount: managedBlocks.length,
    removedLegacyCount: legacyBlocks.length,
  };
}

function isManagedSyncBlock(block) {
  return block.type === "toggle" && readPlainText(block) === SYNC_BLOCK_TITLE;
}

function buildManagedToggle(spec) {
  return {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [textPart(SYNC_BLOCK_TITLE)],
      color: "gray_background",
      children: spec.buildBlocks(),
    },
  };
}

async function listBlockChildren(blockId) {
  const results = [];
  let cursor = undefined;

  while (true) {
    const query = new URLSearchParams({ page_size: "100" });

    if (cursor) {
      query.set("start_cursor", cursor);
    }

    const body = await notionRequest(`/blocks/${blockId}/children?${query.toString()}`, {
      method: "GET",
    });

    results.push(...(body.results ?? []));

    if (!body.has_more || !body.next_cursor) {
      return results;
    }

    cursor = body.next_cursor;
  }
}

async function appendBlockChildren(blockId, children) {
  return notionRequest(`/blocks/${blockId}/children`, {
    method: "PATCH",
    body: { children },
  });
}

async function archiveBlock(blockId) {
  return notionRequest(`/blocks/${blockId}`, {
    method: "PATCH",
    body: { archived: true },
  });
}

async function notionRequest(path, options) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    handleNotionError(response.status, body);
  }

  return body;
}

function readPlainText(block) {
  const richText = block?.[block.type]?.rich_text;

  if (!Array.isArray(richText)) {
    return "";
  }

  return richText.map((part) => part.plain_text ?? part.text?.content ?? "").join("").trim();
}

function paragraph(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [textPart(content)],
    },
  };
}

function heading2(content) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [textPart(content)],
    },
  };
}

function bulletedListItem(content) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [textPart(content)],
    },
  };
}

function numberedListItem(content) {
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [textPart(content)],
    },
  };
}

function toDo(content, checked) {
  return {
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: [textPart(content)],
      checked,
    },
  };
}

function textPart(content) {
  return {
    type: "text",
    text: { content },
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
