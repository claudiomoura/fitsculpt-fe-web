# Notion HQ Setup

Use the root setup script to create the first-level FitSculpt HQ pages in Notion, then run the sync script to make those pages operational.

## Required Environment

Add these values to the repo root `.env.local` file:

```bash
NOTION_API_KEY=secret_...
NOTION_PARENT_PAGE_ID=34f1adaa113b800dbf29f411f0b45a31
```

Security rules:
- Do not commit `.env.local`.
- Do not print, paste, or log `NOTION_API_KEY`.
- Only share the Notion parent page with the intended Notion integration.
- Do not store API keys, tokens, credentials, or secrets in Notion pages.

## Founder Action Required In Notion

Before running the script, open the FitSculpt HQ root page in Notion and share it with the Notion integration connected to `NOTION_API_KEY`.

If this step is missing, the script should fail with a Notion API `403` error.

## Run

From the repository root:

```bash
npm run setup:notion-hq
```

After the base pages exist, sync richer managed content into each HQ child page:

```bash
npm run sync:notion-hq
```

To validate configuration without calling the Notion API:

```bash
npm run setup:notion-hq:check
```

To validate the sync script without calling the Notion API:

```bash
npm run sync:notion-hq:check
```

`node scripts/setup-notion-hq.mjs --dry-run` and `node scripts/sync-notion-hq.mjs --dry-run` are also supported and behave the same as `--check`.

The setup and sync flow manages these child pages under the configured parent page:
- Home
- Company
- Product
- Operating Cadence
- Decisions
- Meetings
- Links

## What The Sync Script Does

`npm run sync:notion-hq` is intended to be rerunnable.

It will:
- find the existing child page by title under the configured FitSculpt HQ parent page
- create the page only if it is missing
- remove the original bootstrap bullets created by `setup:notion-hq` when they match the known starter content
- replace a single managed toggle block named `FitSculpt HQ synced content`
- keep any other page content outside that managed block untouched

Each page receives richer initial sections aligned to the current operating model and beta context, including source-of-truth rules, founder decision flow, beta scope, weekly review cadence, and lightweight meeting or links templates.

## Caveats

- `setup:notion-hq` is intentionally minimal and does not deduplicate existing pages. Running it more than once creates another set of child pages.
- `sync:notion-hq` is the idempotent follow-up step. It works by title under the configured parent page and only rewrites the managed sync block.
- If multiple child pages already exist with the same title, the sync script updates the first matching page it finds and leaves the others untouched.

## Troubleshooting

If the script reports missing environment variables even though `.env.local` exists:
- Keep `.env.local` at the repository root.
- The script checks repo-root `.env` and `.env.local`, but root `.env.local` is the recommended location.
- See `docs/env-strategy.md` for the monorepo env split.
- Values may be quoted and may include spaces around `=`, for example `NOTION_PARENT_PAGE_ID = "34f1..."`.
- Run `npm run setup:notion-hq:check` before the real setup command.
- Run `npm run sync:notion-hq:check` before the real sync command.

If a Notion secret was pasted, screenshotted, logged, or otherwise exposed, rotate it in Notion before continuing. Do not reuse exposed tokens.
