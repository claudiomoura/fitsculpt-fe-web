# Dev setup (backend)

## Seed de exercícios para demo local

A API já expõe um endpoint de seed para desenvolvimento:

- `POST /dev/seed-exercises`

> Segurança: em `NODE_ENV=production` o endpoint responde `403 FORBIDDEN`.

### Passo a passo

1. Suba a API localmente (`apps/api`):

```bash
npm run dev
```

2. Em outro terminal, execute o seed:

```bash
curl -X POST http://localhost:4000/dev/seed-exercises
```

3. Verifique que os exercícios foram populados:

```bash
curl http://localhost:4000/exercises
```

### Evidência esperada

- O `POST /dev/seed-exercises` retorna `{ "ok": true, "seeded": <n> }`.
- O `GET /exercises` retorna uma lista com `length > 0`.
- Campos de mídia (`imageUrl`) aparecem quando houver dados de imagem para o exercício.
