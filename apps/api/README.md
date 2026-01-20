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
| `GOOGLE_REDIRECT_URI` | Callback do OAuth no frontend (`/api/auth/google/callback`). | `https://fitsculpt-fe-web.vercel.app/api/auth/google/callback` |

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
1. Front chama `/api/auth/google/start` (Next proxy).
2. Backend gera `state` e retorna a URL do Google.
3. O Google redireciona para `/api/auth/google/callback` (frontend) e o proxy chama o backend.
4. Backend valida `state`, cria/associa usuário e retorna o cookie de sessão.

### Admin
- Usuários com `role=ADMIN` podem acessar `/admin/users` para listar, bloquear e remover usuários.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run seed:exercises
npm run test
```

## Seed de exercícios

Para carregar a biblioteca inicial de exercícios, execute:

```bash
npm run seed:exercises
```

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
