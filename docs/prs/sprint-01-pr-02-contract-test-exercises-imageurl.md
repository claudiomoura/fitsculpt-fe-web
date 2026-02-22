# Sprint 01 — PR 02

## What this PR adds

- A backend contract test (`apps/api/src/tests/exercisesImageUrl.contract.test.ts`) that calls `GET /exercises` and asserts at least one returned exercise for the seeded fixture has a non-empty `imageUrl`.
- This protects against regressions where normalization ignores `exercise.imageUrl` and returns null/empty values.

## Dataset/seed used by the test

The test creates a deterministic fixture directly in the test database before booting the API:

- Exercise slug: `contract-imageurl-<timestamp>-with-image`
- Exercise name: `Contract ImageUrl With Image <timestamp>`
- `imageUrl`: `https://cdn.example.com/contract-imageurl-<timestamp>.jpg`

Because this fixture is inserted by the test itself, the contract does not depend on external or mutable dev seed data. The fixture is deleted in test cleanup.

## Verification command

Run from repo root:

```bash
npm test --prefix apps/api
```
