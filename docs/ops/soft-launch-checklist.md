# FitSculpt Soft Launch Checklist

## Pre-Launch (50 usuarios)

### Infraestructura
- [ ] `NEXT_PUBLIC_SENTRY_DSN` configurado en producción
- [ ] `REDIS_URL` configurado para BullMQ
- [ ] Variables de entorno verificadas en Vercel/Render

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

## Día 3 - Primer Fix
- [ ] Bug fixes críticos
- [ ] Performance optimizations si needed
- [ ] Feedback de usuarios incorporado

## Semana 2 - Escala
- [ ] Aumentar límite de usuarios si métricas OK
- [ ] Agregar más feature flags para features nuevos
- [ ] Prepara documentación para nuevos testers
