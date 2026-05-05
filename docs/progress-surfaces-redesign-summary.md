# Progress Surfaces Redesign Summary

## Goal

Clarify the three progress-related surfaces so each one owns a single job and the user always knows where to act next.

## Final ownership

- `/app/seguimiento` = daily progress hub
- `/app/seguimiento/body-scan-report` = diagnostic report
- `/app/weekly-review` = weekly decision surface

## What changes

- Progress stops trying to be dashboard, diagnostic report, and weekly decision screen at the same time.
- Body scan becomes the place for confidence, methodology, and body-composition interpretation.
- Weekly review becomes the only place to accept or reject weekly plan changes.

## Main UX moves

- Pull the full check-in and deep analysis out of the main progress hub.
- Put one primary weekly recommendation at the center of weekly review.
- Keep future projection and experiment content as supporting evidence, not the main headline.
- Make mobile users see context, next action, and decision before any deep detail.

## Rollout shape

1. Freeze ownership and CTA rules.
2. Restructure screens using existing data.
3. Harden blocked and ready states.
4. Add analytics and QA coverage.

## Source artifact

- Full spec: `docs/progress-surfaces-redesign-spec.md`

## Notion sync note

- The current Notion HQ sync is top-level and script-managed, not a source-driven product-plan page.
- If this redesign needs to appear in Notion, sync a short summary into the HQ `Product` page linking back to `docs/progress-surfaces-redesign-spec.md`.
