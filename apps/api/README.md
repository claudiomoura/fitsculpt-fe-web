# FitSculpt API

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | URL do banco (SQLite ou Postgres). | `file:./dev.db` |
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
npm run prisma:generate
npm run prisma:migrate
npm run test
```

## Stripe (assinaturas PRO)

1. Crie um produto e um preço recorrente no Stripe.
2. Copie o `Price ID` e configure em `STRIPE_PRO_PRICE_ID`.
3. Gere uma chave secreta e configure `STRIPE_SECRET_KEY`.
4. Crie um endpoint de webhook no Stripe apontando para `POST /billing/webhook` e copie o `Signing secret` para `STRIPE_WEBHOOK_SECRET`.
5. Após alterar o schema, rode `npm run prisma:migrate` e `npm run prisma:generate` para garantir que o banco e o Prisma Client estão atualizados.

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
$env:DATABASE_URL="postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a.virginia-postgres.render.com/fitsculpt_db" 

npx prisma studio

##  crear usuario na BD
node scripts/create-user.mjs tu@email.com TuPassword123 "Tu Nombre" ADMIN

##  mudar pass de  usuario na BD
cd apps\api
node -e "const b=require('cmkh4tvhr0000kxq8os6qhids'); b.hash('Password1234',12).then(h=>console.log(h))"
