# FitSculpt Soft Launch Checklist

## Pre-Launch (50 usuarios)

### Infraestructura
- [ ] `NEXT_PUBLIC_SENTRY_DSN` configurado en producción
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` y `NEXT_PUBLIC_POSTHOG_HOST` configurados en Vercel
- [ ] `REDIS_URL` configurado para BullMQ
- [ ] Variables de entorno verificadas en Vercel/Render
- [ ] Revisar `docs/ops/env-deployment-matrix.md` antes de tocar envs de release

#### Variables minimas de produccion

- Frontend (Vercel):
  - `BACKEND_URL`
  - `NEXT_PUBLIC_BACKEND_URL`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`
  - `NEXT_PUBLIC_APP_ENV=production`
- Backend (Render API):
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `COOKIE_SECRET`
  - `CORS_ORIGIN` (URL de Vercel)
  - `APP_BASE_URL` (URL de Vercel)
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`

### Monitoreo
- [ ] Dashboard de Sentry configurado
- [ ] Alertas de errores configuradas
- [ ] Rate limiting activo para rutas AI

### Feature Flags
- [ ] `NEXT_PUBLIC_FF_WAITLIST_MODE=true` (control de acceso)
- [ ] `NEXT_PUBLIC_FF_BETA_FEATURES=false` ( features incompletas off)

### Base de Datos
- [ ] Neon branching configurado para prod
- [ ] Backups automáticos activos
- [ ] Índices de performance creados

### Analytics
- [ ] PostHog con 50 usuarios activos
- [ ] Eventos RCT rastreados
- [ ] Web Vitals monitoreados

### Seguridad
- [ ] CORS configurado para dominio de producción
- [ ] Rate limiting en todas las rutas públicas
- [ ] Validación de input en todos los endpoints

## Día 1 - Monitoreo
- [ ] Ver logs de errores en Sentry
- [ ] Revisar tiempos de respuesta API
- [ ] Verificar rate limits no alcanzados
- [ ] Check PostHog para eventos

## CI Smoke Gate

- [ ] Ejecutar `npm run e2e:smoke:beta` en `apps/web` antes de marcar release candidate
- [ ] Validar bundle base: `npm run rc:gate:bundle`

## Día 3 - Primer Fix
- [ ] Bug fixes críticos
- [ ] Performance optimizations si needed
- [ ] Feedback de usuarios incorporado

## Semana 2 - Escala
- [ ] Aumentar límite de usuarios si métricas OK
- [ ] Agregar más feature flags para features nuevos
- [ ] Prepara documentación para nuevos testers
