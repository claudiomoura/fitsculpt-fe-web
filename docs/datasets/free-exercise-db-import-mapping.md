# free-exercise-db → Exercise mapping

Source dataset consumed at runtime by importer script:
- Primary source (default): local JSON files in `apps/web/public/exercise-db/exercises/*.json`
- Remote fallback: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
- Script: `apps/api/scripts/import-free-exercise-db.ts`

## Imported fields

| Source field (`free-exercise-db`) | Target field (`Exercise`) | Notes |
| --- | --- | --- |
| `id` | `sourceId` | Saved as `free-exercise-db:<id>` and used as unique upsert key (idempotent imports). |
| `name` | `name` | Trimmed. |
| `name` + `id` | `slug` | Generated with slugify over `<name>-<id>` for deterministic uniqueness. |
| `equipment` | `equipment` | Trimmed, nullable. |
| `primaryMuscles[0]` | `mainMuscleGroup` | Fallback to `General` if absent. |
| `secondaryMuscles[]` | `secondaryMuscleGroups[]` | Trimmed + de-duplicated. |
| `instructions[]` | `description` | Joined with line breaks. |
| `images[0]` | `imageUrl` | Built as raw GitHub URL: `.../exercises/<id>/<filename>`. |

## Fields intentionally not imported / not available now

- `technique`: set to `null`.
- `tips`: set to `null`.
- `mediaUrl`: set to `null`.
- Any source metadata not represented in current Prisma `Exercise` model (e.g., force/level/mechanic/category) is ignored in this phase.

## Runtime guards

- Import is blocked in production unless `ALLOW_IMPORT=1`.
- Import auto-skips when existing `Exercise` catalog (`source=free-exercise-db`) is already populated with at least the dataset size.
- Upsert is idempotent by unique `sourceId`.

## Commands

- `npm run db:import:free-exercise-db --prefix apps/api`
- Optional bootstrap chaining: `IMPORT_EXERCISES=1 npm run db:bootstrap --prefix apps/api`
