# PR B — Manual test plan (`/exercises`)

## Query params soportados

- `q` o `query`: búsqueda por nombre (contains case-insensitive).
- `muscle` o `primaryMuscle`: filtra por `mainMuscleGroup` o `secondaryMuscleGroups`.
- `equipment`: filtra por equipamiento.
- Paginación offset:
  - `page` (base 1) + `limit`
  - o `offset` + `limit`
- Paginación cursor:
  - `cursor` + `take`

## Respuesta (`GET /exercises`)

```json
{
  "items": [
    {
      "id": "clx123",
      "slug": "squat",
      "name": "Squat",
      "source": "free-exercise-db",
      "sourceId": "free-001",
      "equipment": "Barbell",
      "imageUrls": ["https://.../1.png"],
      "imageUrl": "https://.../1.png",
      "mainMuscleGroup": "Legs",
      "secondaryMuscleGroups": ["Glutes"],
      "description": "...",
      "technique": "...",
      "tips": "..."
    }
  ],
  "total": 1200,
  "limit": 20,
  "offset": 0,
  "page": 1,
  "nextCursor": "clx123",
  "hasMore": true
}
```

## Respuesta (`GET /exercises/:id`)

Devuelve el mismo DTO de item (incluye `imageUrls`/`imageUrl`, `source` y `sourceId`).

## Curl examples

```bash
curl -sS "http://localhost:4000/exercises?q=press&page=1&limit=20" -H "Authorization: Bearer <TOKEN>"
curl -sS "http://localhost:4000/exercises?muscle=Pecho&equipment=Mancuernas&limit=10&offset=0" -H "Authorization: Bearer <TOKEN>"
curl -sS "http://localhost:4000/exercises?cursor=<LAST_ID>&take=25" -H "Authorization: Bearer <TOKEN>"
curl -sS "http://localhost:4000/exercises/<ID>" -H "Authorization: Bearer <TOKEN>"
```

## Prisma Studio checks

1. Abrir Studio: `npm run db:studio` (en `apps/api`).
2. Revisar `Exercise` y validar columnas:
   - `source`
   - `sourceId`
   - `imageUrls`
3. Validar que registros seeded tengan `source = free-exercise-db` y `sourceId` estable.
