# Telemetry Core Loop Dashboard Spec

## Goal

Define the minimum dashboard needed to measure the FitSculpt core loop without changing role contracts or inventing new backends.

## Events in scope

- `today_view`
- `today_cta_click`
- `workout_started`
- `workout_completed`
- `nutrition_meal_logged`
- `checkin_saved`
- `weekly_review_opened`
- `adjustment_accepted`
- `adjustment_rejected`

## Dashboard slices

| Dashboard | Question answered | Primary events |
| --- | --- | --- |
| Core Loop Funnel | Do users move from Today to action completion? | `today_view`, `today_cta_click`, `workout_completed`, `nutrition_meal_logged`, `checkin_saved` |
| Weekly Review Adoption | Do users open and act on weekly recommendations? | `weekly_review_opened`, `adjustment_accepted`, `adjustment_rejected` |
| Premium Pressure | Are gating and upgrades aligned with real usage? | `today_cta_click`, billing events from `docs/ops/analytics-setup.md` |

## Required properties

- `origin`
- `target`
- `mealType`
- `weekKey`
- `recommendationId`
- `recommendationType`

## Role safety

- USER dashboards use only user core-loop events.
- TRAINER and ADMIN keep separate operational dashboards; no user role routing changes are introduced here.
