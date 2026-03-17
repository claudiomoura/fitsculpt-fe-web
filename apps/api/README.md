# FitSculpt API

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | URL do banco Postgres (obrigatório para `db:bootstrap`). Deve começar com `postgres://` ou `postgresql://`. | `postgresql://user:pass@localhost:5432/fitsculpt_api_dev?schema=public` |
| `JWT_SECRET` | Segredo para assinar JWT. | `super-secret-32` |
| `COOKIE_SECRET` | Segredo para cookies assinados. | `cookie-secret-32` |
| `CORS_ORIGIN` | Origem permitida para o frontend. | `https://fitsculpt-fe-web.vercel.app` |
| `APP_BASE_URL` | URL base do frontend (links em emails). | `https://fitsculpt-fe-web.vercel.app` |
| `EMAIL_PROVIDER` | Provedor de email (`console` ou `resend`). | `resend` |
| `EMAIL_FROM` | Remetente dos emails. | `no-reply@fitsculpt.app` |
| `RESEND_API_KEY` | Chave da API da Resend (se usar `resend`). | `re_...` |
| `VERIFICATION_TOKEN_TTL_HOURS` | Validade do token de verificação (horas). | `24` |
| `VERIFICATION_RESEND_COOLDOWN_MINUTES` | Cooldown para reenvio (minutos). | `10` |
| `ADMIN_EMAIL_SEED` | Email a promover para ADMIN no boot. | `admin@fitsculpt.app` |
| `GOOGLE_CLIENT_ID` | OAuth client ID. | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. | `...` |
| `GOOGLE_REDIRECT_URI` | Callback do OAuth no backend (`/auth/google/callback`). | `https://api.fitsculpt.app/auth/google/callback` |
| `OPENAI_API_KEY` | Chave da API da OpenAI. | `sk-...` |
| `OPENAI_BASE_URL` | Base URL da OpenAI (opcional). | `https://api.openai.com/v1` |
| `AI_DAILY_LIMIT_FREE` | Limite diário de chamadas IA (FREE). | `3` |
| `AI_DAILY_LIMIT_PRO` | Limite diário de chamadas IA (PRO). | `30` |
| `AI_PRICING_JSON` | JSON com preços por modelo (centavos por 1k tokens). | `{"gpt-4o-mini":{"inputPer1K":15,"outputPer1K":60}}` |
| `PRO_MONTHLY_TOKENS` | Tokens mensais para PRO (recarga Stripe). | `15000` |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (modo test/live). | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook do Stripe. | `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | Price ID do plano PRO (assinatura). | `price_...` |

## Configuração segura de ambiente

- `db:bootstrap` exige `DATABASE_URL` válido com protocolo `postgres://` ou `postgresql://`; sem isso o script falha imediatamente com mensagem de correção.
- Copie `apps/api/.env.example` para `.env` apenas no ambiente local/servidor.
- Nunca commite valores reais de segredos (`JWT_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`, `*_API_KEY`, `*_SECRET`).
- Gere segredos longos e aleatórios para produção (mínimo recomendado: 32 caracteres).
- Dumps de banco (`*.dump`, `*.sql`, `*.db`) e arquivos de credenciais devem ficar fora do versionamento.

## Fluxo de autenticação

### Signup (com promo code)
1. `POST /auth/signup` com `email`, `password`, `name` e `promoCode`.
2. O backend valida o promo code (`FitSculpt-100%`) e cria o usuário com `emailVerifiedAt = null`.
3. Um token de verificação é gerado (hash no banco) e enviado por email.

### Verificação de email
1. O usuário acessa `/verify-email?token=...` no frontend.
2. O frontend faz proxy para `GET /auth/verify-email?token=...`.
3. Se válido, o token é invalidado e `emailVerifiedAt` é preenchido.

### Login
1. `POST /auth/login` com `email` e `password`.
2. Se `emailVerifiedAt` estiver vazio, retorna `EMAIL_NOT_VERIFIED`.
3. Se ok, envia cookie `fs_token`.

### Reenvio de verificação
1. `POST /auth/resend-verification` com `email`.
2. Se ainda não verificado e respeitando cooldown, reenvia o email.

### Google OAuth
1. Front chama `GET /auth/google/start` no backend e recebe `{ url }`.
2. O frontend redireciona o usuário para a URL do Google.
3. O Google redireciona para `GET /auth/google/callback` (backend).
4. O backend valida o `state`, cria/associa usuário, seta o cookie `fs_token` e redireciona para o frontend.

### Admin
- Usuários com `role=ADMIN` podem acessar `/admin/users` para listar, bloquear e remover usuários.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run start:prod
npm run db:deploy
npm run db:generate
npm run db:dump             # backup manual (Postgres via pg_dump)
npm run db:push:emergency   # somente para desbloqueio quando deploy estiver bloqueado por drift
npm run prisma:generate
npm run prisma:migrate      # local only (NUNCA no Render)
npm run test
```

## Build reproducível (src -> dist)

- `dist/` é sempre gerado a partir de `src/` (fonte única).
- `npm run build` limpa `dist/` antes de compilar para evitar artefatos antigos.
- `npm run build:repro` executa dois builds consecutivos e valida que os artefatos em `dist/` são idênticos (rebuild consistente para CI).

Fluxo recomendado em CI para backend:

```bash
npm ci
npm run build:repro
npm run test:route-parity
```

## Seed local de exercícios (demo)

Para popular o catálogo de exercícios de forma reproduzível em ambiente local, execute:

```bash
curl -X POST http://localhost:4000/dev/seed-exercises
```

Depois valide:

```bash
curl http://localhost:4000/exercises
```

Guia rápido consolidado: `README/dev-setup.md`.


## Backups diarios (sin tocar producto)

### Opción recomendada (Render)

Si tu plan de Render ofrece backups automáticos de Postgres, habilítalos en el servicio de base de datos. Es la vía más simple (cero mantenimiento) para restaurar o migrar sin estrés.

### Opción repo (`db:dump`)

Este repo incluye un comando para exportar un dump de Postgres sin agregar dependencias nuevas:

```bash
npm run db:dump
```

Detalles:
- Requiere `DATABASE_URL` apuntando al Postgres objetivo.
- Requiere `pg_dump` disponible en `PATH`.
- Guarda archivos `.dump` (formato custom de Postgres) en `apps/api/backups/`.

#### Programación diaria (Windows Task Scheduler)

Ejemplo de script PowerShell (`C:\scripts\fitsculpt-db-dump.ps1`):

```powershell
$env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"
Set-Location "C:\ruta\fitsculpt-fe-web\apps\api"
npm run db:dump
```

Luego en Task Scheduler:
1. Create Task -> Trigger: Daily.
2. Action: `powershell.exe`
3. Arguments: `-ExecutionPolicy Bypass -File C:\scripts\fitsculpt-db-dump.ps1`

#### Programación diaria (GitHub Actions)

> Requiere agregar `DATABASE_URL` como secret del repo.

```yaml
name: Daily DB dump
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  dump:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v4
      - name: Install PostgreSQL client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client
      - name: Create dump
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npm run db:dump
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-dump
          path: apps/api/backups/*.dump
```

## Workflow de migrações (seguro para Render)

- **Local (desenvolvimento):** gerar novas migrations com `prisma migrate dev` usando um Postgres local.
- **Render (deploy):** aplicar migrations existentes com `prisma migrate deploy`.
- **Nunca rode `prisma migrate dev` no banco do Render.**

### Exemplo de Postgres local (Docker Compose)

Crie `apps/api/docker-compose.dev-db.yml` com:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: fitsculpt_api_dev
    ports:
      - "5432:5432"
    volumes:
      - fitsculpt_api_dev_data:/var/lib/postgresql/data

volumes:
  fitsculpt_api_dev_data:
```

Suba o banco e gere migration localmente:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitsculpt_api_dev?schema=public"
npx prisma migrate dev --name <nome_da_migration>
npm run db:generate
```

Deploy no Render:

```bash
npm run db:deploy
```

### Emergência (não-destrutivo, uso excepcional)

Se `db:deploy` estiver bloqueado por drift e for necessário apenas desbloquear criação de tabela ausente (ex.: `GymMembership`), use:

```bash
npm run db:push:emergency
```

> Este comando **não** substitui o fluxo oficial com migrations versionadas; use apenas para desbloqueio.

## Runbook DEV: Neon branch + baseline sem perder dados (PowerShell)

> Objetivo: sair de cenários com banco já populado (ex.: cópia de produção) sem apagar dados e sem travar o fluxo de `prisma migrate deploy`.

### Quando usar

- Banco de DEV veio com dados existentes (snapshot/cópia) e `migrate deploy` retorna `P3005`.
- Banco está com drift e a aplicação falha por coluna/tabela faltando (`P2022`).
- Você precisa alinhar histórico Prisma (`_prisma_migrations`) sem resetar o banco.

### Pré-requisitos

1. Crie uma **Neon branch** a partir da branch com dados que você quer preservar (o Neon clona os dados).
2. No `.env`, use a **Direct connection** do Neon para operações de migração/diff.

```powershell
# Exemplo (ajuste para sua branch Neon)
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxx-xxx.sa-east-1.aws.neon.tech/fitsculpt?sslmode=require&channel_binding=require"
```

> Recomendação: para `migrate`/`diff`, evite URL pooled/proxy quando houver opção de conexão direta.

### Passo a passo oficial (baseline sem perda de dados)

1. Gere o SQL mínimo de alinhamento entre o estado esperado (schema Prisma) e o banco atual:

```powershell
npx prisma migrate diff `
  --from-url "$env:DATABASE_URL" `
  --to-schema-datamodel prisma/schema.prisma `
  --script > .\tmp\baseline-align.sql
```

2. Revise o arquivo `.\tmp\baseline-align.sql` e confirme que ele contém apenas o necessário (evite comandos destrutivos não intencionais).

3. Aplique o SQL manualmente no banco Neon (SQL Editor/psql) para corrigir drift sem reset.

4. Marque a migration inicial/baseline como aplicada no histórico do Prisma:

```powershell
npx prisma migrate resolve --applied 0001_init
```

> Substitua `0001_init` pelo nome real da migration baseline da pasta `prisma/migrations`.

5. Valide o estado final:

```powershell
npx prisma migrate status
```

Resultado esperado: status consistente/OK, sem pendências bloqueantes para `migrate deploy`.

### Erros comuns e como resolver

#### `P1000` (Authentication failed)

- Causa comum: senha/usuário incorretos ou URL errada.
- Correção:
  1. Faça reset da senha no Neon (ou recrie credencial).
  2. Atualize `DATABASE_URL` com usuário, senha, host e database corretos.
  3. Teste novamente com `npx prisma migrate status`.

#### `P3005` (Database schema is not empty)

- Causa comum: banco já tem tabelas/dados, mas `_prisma_migrations` ainda não foi baselineado.
- Correção:
  1. **Não** rode `migrate deploy` direto nesse estado.
  2. Execute fluxo de baseline acima (`migrate diff --script` + aplicar SQL mínimo + `migrate resolve --applied ...`).
  3. Revalide com `npx prisma migrate status`.

#### `P2022` (Coluna não existe)

- Causa comum: drift entre schema Prisma e estrutura real do banco.
- Correção:
  1. Gere diff SQL (`migrate diff --script`).
  2. Aplique apenas DDL mínima para alinhar colunas/tabelas faltantes.
  3. Faça baseline/resolve quando necessário.
  4. Rode `npx prisma migrate status` e teste o endpoint que falhava.

## Stripe (assinaturas PRO)

1. Crie um produto e um preço recorrente no Stripe.
2. Copie o `Price ID` e configure em `STRIPE_PRO_PRICE_ID`.
3. Gere uma chave secreta e configure `STRIPE_SECRET_KEY`.
4. Crie um endpoint de webhook no Stripe apontando para `POST /billing/webhook` e copie o `Signing secret` para `STRIPE_WEBHOOK_SECRET`.
5. Após alterar o schema, rode `npm run prisma:migrate` e `npm run db:generate` no ambiente local; em produção/Render use `npm run db:deploy`.

## Testes manuais (curl)

```bash
# Login (salva cookie)
curl -i -c /tmp/fs_cookie.txt \\
  -X POST http://localhost:4000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"password"}'

# Daily tip (usa cookie)
curl -i -b /tmp/fs_cookie.txt \\
  -X POST http://localhost:4000/ai/daily-tip \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Feed (usa cookie)
curl -i -b /tmp/fs_cookie.txt http://localhost:4000/feed
```

## Gym flows (Sprint 23 / PR-A)

### Endpoints

- `POST /admin/gyms` (admin): cria gym com `name` e `code`.
- `GET /admin/gyms` (admin): lista gyms.
- `DELETE /admin/gyms/:gymId` (admin): remove gym sem memberships.
- `GET /gyms` (usuário autenticado): lista gyms para solicitação de entrada.
- `POST /gyms/join` (usuário autenticado): cria/reativa solicitação `PENDING`.
- `POST /gyms/join-by-code` (usuário autenticado): solicita entrada usando `code`.
- `GET /admin/gym-join-requests` (gym admin): lista solicitações pendentes da gym.
- `POST /admin/gym-join-requests/:membershipId/accept` (gym admin): `PENDING -> ACTIVE`.
- `POST /admin/gym-join-requests/:membershipId/reject` (gym admin): `PENDING -> REJECTED`.
- `GET /admin/gyms/:gymId/members` (gym admin/trainer): lista membros `ACTIVE`.

### Regras de negócio

- Estado de join request: somente `PENDING` pode ser aceito/rejeitado.
- Delete gym: bloqueado com `400 GYM_DELETE_BLOCKED` quando existem memberships.
- Erros esperados de fluxo: `400`, `403`, `404` com `error` e `message` claros.

### Como testar localmente

```bash
# 1) iniciar API
npm run dev

# 2) login admin (cookie)
curl -i -c /tmp/fs_admin_cookie.txt \
  -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# 3) criar gym (admin)
curl -i -b /tmp/fs_admin_cookie.txt \
  -X POST http://localhost:4000/admin/gyms \
  -H "Content-Type: application/json" \
  -d '{"name":"Iron Temple","code":"IRON01"}'

# 4) listar gyms admin
curl -i -b /tmp/fs_admin_cookie.txt http://localhost:4000/admin/gyms

# 5) login user comum (cookie)
curl -i -c /tmp/fs_user_cookie.txt \
  -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 6) user lista gyms
curl -i -b /tmp/fs_user_cookie.txt http://localhost:4000/gyms

# 7) user solicita entrada por code (retorna pending)
curl -i -b /tmp/fs_user_cookie.txt \
  -X POST http://localhost:4000/gyms/join-by-code \
  -H "Content-Type: application/json" \
  -d '{"code":"IRON01"}'

# 8) gym admin lista requests pendentes
curl -i -b /tmp/fs_admin_cookie.txt http://localhost:4000/admin/gym-join-requests

# 9) gym admin aceita request
curl -i -b /tmp/fs_admin_cookie.txt \
  -X POST http://localhost:4000/admin/gym-join-requests/<membershipId>/accept

# 10) membros ativos refletem aceite
curl -i -b /tmp/fs_admin_cookie.txt \
  http://localhost:4000/admin/gyms/<gymId>/members

# 11) delete bloqueado quando há membros
curl -i -b /tmp/fs_admin_cookie.txt \
  -X DELETE http://localhost:4000/admin/gyms/<gymId>
```

## Troubleshooting

- Se aparecer `Can't reach database server at \`localhost:5432\``, verifique se o Postgres está rodando e se `DATABASE_URL` aponta para a instância correta.


## Password e como acceder
intern
postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a/fitsculpt_db


Exter
postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a.virginia-postgres.render.com/fitsculpt_db


FitSculpt-100%


claudio.moura@sapo.pt
Password1234

test@gmail.com	
Password123


##  acceder a BD 

Tem de serr onde esta o eschema  em C:\Users\Moura\Documents\Work\FitSculpt\fitsculpt-fe-web\apps\api>
$env:DATABASE_URL="postgresql://bd2_ukh7_user:pkY5rjnC78bP4CR13yzFTLDqFTb0Kk6O@dpg-d694rj75r7bs73f2vsqg-a.virginia-postgres.render.com/bd2_ukh7"
 
npx prisma studio


##  crear usuario na BD
node scripts/create-user.mjs tu@email.com TuPassword123 "Tu Nombre" ADMIN


$env:ALLOW_SEED='1'
$env:DEMO_ADMIN_EMAIL='claudio.moura@sapo.pt'
$env:DEMO_ADMIN_PASSWORD='Password1234'
$env:DEMO_GYM_NAME='Demo Gym'
$env:DEMO_GYM_CODE='DEMO123'

npx prisma db seed --schema prisma/schema.prisma


$sql = 'UPDATE "User" SET "role" = ''ADMIN'' WHERE "email" = ''claudio.moura@sapo.pt'';'
$sql | npx prisma db execute --schema prisma/schema.prisma --stdin


##  mudar pass de  usuario na BD
cd apps\api
node -e "const b=require('cmkh4tvhr0000kxq8os6qhids'); b.hash('Password1234',12).then(h=>console.log(h))"

## Importador `free-exercise-db`

Comando principal (idempotente por `Exercise.sourceId`):

```bash
npm run db:import:free-exercise-db
```

Con `npm --prefix` desde la raíz del monorepo:

```bash
npm run db:import:free-exercise-db --prefix apps/api
```

Guard de seguridad:
- en `NODE_ENV=production` no corre salvo que `ALLOW_IMPORT=1`.

Fuente de datos por defecto:
- usa el catálogo local `apps/web/public/exercise-db/exercises/*.json`.
- si no encuentra JSON local, hace fallback al dataset remoto de `free-exercise-db`.
- si la DB ya tiene el catálogo `source=free-exercise-db` (mismo o mayor tamaño), el import se omite.

Bootstrap opcional:

```bash
IMPORT_EXERCISES=1 npm run db:bootstrap
```
