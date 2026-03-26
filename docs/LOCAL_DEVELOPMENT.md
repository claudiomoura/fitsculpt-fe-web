# FitSculpt Local Development Guide

## Quick Start

### 1. Iniciar BD local con Docker

```bash
cd apps/api
npm run db:local:start
```

Esto inicia PostgreSQL 16 en puerto 5432 con:
- User: `postgres`
- Password: `postgres`
- Database: `fitsculpt_api_dev`

### 2. Activar modo local

```bash
# El archivo .env.local ya está configurado
# Verifica que tienes las variables correctas:
cat apps/api/.env.local | head -10
```

El `.env.local` tiene prioridad sobre `.env` gracias a `dotenv/config`.

### 3. Aplicar schema y seed

```bash
cd apps/api
npm run db:push:emergency  # Crea/actualiza tablas
npm run db:seed            # Datos iniciales
```

### 4. Iniciar API

```bash
cd apps/api
npm run dev
```

---

## Comandos útiles

### Docker
```bash
npm run db:local:start   # Iniciar PostgreSQL local
npm run db:local:stop    # Detener PostgreSQL
npm run db:local:reset   # Reset completo (borra datos!)
```

### Base de datos
```bash
npm run db:doctor         # Verificar conexión
npm run db:studio         # Abrir Prisma Studio (UI)
npm run db:push:emergency # Push schema sin migration
npm run db:seed           # Ejecutar seed
npm run db:dump           # Dump de datos
```

### Migración de datos

```bash
# Exportar desde Neon (prod) a JSON
npm run db:export

# Importar a local
npm run db:import

# Sync solo usuarios específicos
npm run db:sync
```

---

## Cambiar entre Neon y Local

### Modo Local (desarrollo)
```bash
# Ya está configurado en .env.local
# Solo necesitas:
cd apps/api
npm run db:local:start
npm run dev
```

### Modo Neon (producción)
```bash
# Renombrar .env.local para desactivarlo
mv apps/api/.env.local apps/api/.env.local.disabled

# Asegurate que .env tenga credenciales de Neon
npm run dev
```

---

## Scripts de Migración

### Exportar datos desde Neon
```bash
npm run db:export
```
Esto crea `migration-export.json` con:
- Users
- UserProfiles
- Recipes
- Exercises
- UserFoods
- Gyms

### Importar a local
```bash
npm run db:import
```
Esto upserts todos los datos, evitando duplicados.

### Sync específico
```bash
# Solo usuarios específicos
npm run db:sync
```

---

## Troubleshooting

### "Connection refused" en puerto 5432
```bash
# Verifica que Docker está corriendo
docker ps

# Inicia el contenedor
npm run db:local:start
```

### "Database does not exist"
```bash
# Crear base de datos manualmente
docker exec -it fitsculpt_api_dev-postgres-1 psql -U postgres -c "CREATE DATABASE fitsculpt_api_dev;"
```

### Schema mismatch
```bash
# Force push (borra datos!)
npm run db:push:emergency

# O con reset completo
npm run db:local:reset
```

---

## Tests con BD local

Para tests, usa una base de datos separada:

```bash
# Crear DB de test
docker exec -it fitsculpt_api_dev-postgres-1 psql -U postgres -c "CREATE DATABASE fitsculpt_api_test;"
```

Los tests pueden apuntar a `fitsculpt_api_test` para no tocar datos de desarrollo.
