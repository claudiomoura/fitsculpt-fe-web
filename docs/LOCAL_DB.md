# Local Postgres (Dev/Test)

This guide runs FitSculpt with a local PostgreSQL instance only for development/testing.
Production config is not changed.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js + pnpm installed
- Repo dependencies installed (`pnpm install` in `apps/api` and `apps/web`)

## One-time setup

1) Copy local env templates

```bash
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local
```

PowerShell:

```powershell
Copy-Item apps/api/.env.local.example apps/api/.env.local
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

2) Start local Postgres

```bash
pnpm --dir apps/api run db:up
```

3) Apply schema + seed demo data

```bash
pnpm --dir apps/api run db:migrate
pnpm --dir apps/api run db:seed
```

## Daily run

Start database:

```bash
pnpm --dir apps/api run db:up
```

Start API (terminal 1):

```bash
pnpm --dir apps/api dev
```

Start WEB (terminal 2):

```bash
pnpm --dir apps/web dev
```

App URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

## Full reset

Reset DB schema and reseed demo data:

```bash
pnpm --dir apps/api run db:reset
```

Optional hard reset (drop containers + volumes):

```bash
docker compose -f apps/api/docker-compose.dev-db.yml down -v
pnpm --dir apps/api run db:up
pnpm --dir apps/api run db:migrate
pnpm --dir apps/api run db:seed
```

## Troubleshooting

- Port 5432 busy
  - Stop another Postgres service or container using port 5432.
  - Check with `docker ps` and stop conflicting container.

- Prisma cannot connect (`Can't reach database server`)
  - Ensure DB container is up: `docker compose -f apps/api/docker-compose.dev-db.yml ps`
  - Re-run: `pnpm --dir apps/api run db:up`

- Broken local schema/data
  - Run `pnpm --dir apps/api run db:reset`
  - If still broken, use hard reset (`down -v`) and migrate/seed again.

- API uses wrong backend URL in web
  - Check `apps/web/.env.local` points to `http://localhost:4000`

## Safety

- `.env.local` files are gitignored; do not commit real secrets.
- Keep production URLs/credentials out of local files.
