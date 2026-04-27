# Linear Automation

## Required Environment Variables

- `LINEAR_API_KEY`

The setup script reads the repo root `.env` and `.env.local` files, and shell environment variables still take precedence. See `docs/env-strategy.md` for the monorepo env split.

## Commands

```bash
npm run setup:linear:check
npm run setup:linear
```

## What The Script Creates

The script `scripts/setup-linear-core.mjs` uses the Linear GraphQL API to ensure the following baseline objects exist:

- team: `Core` with key `CORE`
- workspace label groups and child labels for:
  - type
  - priority
  - severity
  - function
  - source
  - platform
  - decision
- projects:
  - `Beta Launch Readiness`
  - `Activation and Onboarding`
  - `Workout Core Experience`
  - `Stability and APK Distribution`
  - `Week 1 Beta Feedback`
  - `Operating System and Documentation`

The script is intentionally idempotent:

- `--check` performs read-only GraphQL queries and exits non-zero when required setup is still missing
- apply mode only creates missing automatable objects
- existing objects are left unchanged
- if a label name already exists elsewhere in the workspace or on a team, the script warns, skips that create, and reports the manual follow-up instead of failing mid-run

## What Stays Manual

This first-pass automation intentionally does not mutate the following:

- workflow-state alignment for the desired status model: `Inbox`, `Planned`, `In Progress`, `Blocked`, `In Review`, `Ready for Release`, `Done`, `Canceled`
- cycles such as `Beta Week 1` through `Beta Week 4`
- Linear issue templates

Why these stay manual for now:

- the desired workflow model needs explicit type and ordering choices inside the workspace
- cycle setup depends on how the founder wants calendar alignment and cadence configured
- template creation exists in the API, but this repo does not yet carry a verified template payload contract worth automating blindly

Use `docs/linear-issue-templates.md` as the manual source for issue-template content.

## Troubleshooting

### Missing API key

If the script prints `Missing LINEAR_API_KEY`, add only the variable name below to the repo root `.env.local`:

```dotenv
LINEAR_API_KEY=...
```

Do not commit secrets.

### Authentication or permission errors

If the GraphQL API returns `401`, `403`, or a permission-related message:

- confirm the token is valid for the intended Linear workspace
- confirm the token holder can create teams, labels, and projects
- rerun `npm run setup:linear:check`

### Team already exists under a different configuration

The script matches the team by exact name `Core` or exact key `CORE`.

If the workspace already has the intended team under a different name or key:

1. rename the existing Linear team manually, or
2. update `scripts/setup-linear-core.mjs` to match the founder-approved canonical team identity before applying mutations

### Workflow states still show as missing

That is expected until the Core team workflow is manually aligned to the desired status model. The script reports the missing states but does not modify them.

### Duplicate label name errors or warnings

If the workspace already contains a label with the same name in a different group or scope, Linear may reject creating the grouped label even when the exact `Group / Label` pair is missing.

The setup script now handles that case by:

- reusing the label when the exact workspace group/name pair already exists
- warning and skipping creation when the same name exists elsewhere and cannot be safely regrouped by the script
- continuing the rest of setup and listing the collision in the post-run summary

If you see a warning for a skipped label, reconcile that label manually in Linear, then rerun:

```bash
npm run setup:linear
```
