# MISIÓN: Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)
Fecha: {{YYYY-MM-DD}}
Autor/a auditoría: {{NOMBRE_O_ALIAS}}
Solicitado por: Founder/PM (FitSculpt)
Motivo: Necesitamos un mapa completo y verificable de “qué existe hoy” + gaps del MVP modular + readiness para vender a un gym pequeño.

## Rol (importante)
Sois un equipo de **Senior Staff Architects** (Full-Stack + UI/UX + producto), con estándares “Apple-grade”.
Quiero una auditoría exigente: claridad, evidencia, prioridades. Cero suposiciones sin marcar.

## Reglas obligatorias del repo (no negociar)
- No inventar campos/entidades/estados en frontend. Si falta dato: endpoint real o schema real.
- Funcionalidad incompleta: se esconde al usuario final (nada de placeholders fake).
- Backend es la fuente de verdad para reglas, permisos, cálculos y datos persistidos.
- No romper `fs_token`, auth/sesión, rutas existentes ni llamadas BFF `/api/*`.

---

# ENTREGABLE (único): “Auditoria_FitSculpt_{{YYYY-MM-DD}}.md”
Debe ser legible para:
1) PM: journeys, gaps, métricas, prioridades
2) Arquitecto Jefe: arquitectura, contratos FE/BE, calidad, riesgos

Todo debe tener evidencia (o marcar “Assunção”).

## 1) Executive Summary (máx 12 bullets)
- Estado general: Release-ready (sí/no) y por qué
- Estado MVP Modular (sí/no) y por qué
- Estado Gym Pilot (sí/no) y por qué
- Top 5 riesgos + top 5 quick wins

## 2) Inventario de Producto “qué existe hoy”
### 2.1 Mapa de navegación
- Lista de pantallas core (rutas) y dónde viven
- Qué es dev/admin vs usuario final
- Callejones sin salida detectados

### 2.2 Flujos end-to-end (journeys)
Documentar pasos + resultado esperado:
- Login + acceso a `/app` protegido
- Hoy + 1 acción rápida
- Biblioteca: lista → detalle
- Tracking: crear 1 registro y confirmar persistencia
- Food log: registrar ítems por gramos y ver macros/calorías (si existe)
- Onboarding (si existe)
- Dashboard semanal (si existe)
- IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)
- IA Fitness: generar plan + ajuste semanal (si existe)
- Gym Pilot: usuario se une a gym (aceptación o código) + admin gestiona + asigna plan (si existe)

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)
- Tabla: feature vs tier
- Qué está implementado de verdad vs planeado
- Evidencia: pantallas, flags, endpoints, settings/billing

## 3) Auditoría UX (mobile-first)
- Consistencia tab bar y navegación
- Estados obligatorios: loading/empty/error/success/disabled
- Copy/i18n: inconsistencias
- 10 fricciones concretas + recomendación

## 4) Auditoría de Arquitectura y Contratos
### 4.1 Arquitectura real (Frontend + BFF + Backend)
- Resumen de dominios: Auth/Profile/Training/Nutrition/Tracking/Library/AI/Billing/Admin
- Zonas sensibles: `fs_token`, BFF `/api/*`, contratos usados por UI

### 4.2 Contratos FE↔BE (mapa)
- Tabla por endpoint consumido desde FE:
  - `/api/*` (BFF)
  - backend real
  - request/response esperado
  - estado: OK / Mismatch / Missing
- Señalar mismatches que rompen UX o módulos (entitlements, gym, trainer, planes, billing)

### 4.3 IA (assistiva)
- Dónde se usa IA hoy
- Output JSON estructurado + validación antes de persistir + fallback
- Riesgos (PII/logs) y mitigaciones

## 5) Calidad y Release Readiness (con evidencia)
### 5.1 Evidencia técnica
Reportar PASS/FAIL y pegar errores relevantes:
- build web
- lint web
- typecheck (si existe)
- tests web
- tests api
Incluid commit hash auditado y entorno (node version).

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)
Para cada ítem: PASS/FAIL + “por qué falla” + evidencia.
A) DoD mínimo: login, /app protegido, tab bar, Hoy+1 acción, tracking persistente, biblioteca lista+detalle
B) Entitlements modular: Free vs Nutrición Premium vs Fitness Premium vs Bundle vs Gym
C) Free: métricas básicas + rendimiento + food log con macros/calorías
D) Nutrición Premium: plan semanal + lista compra + ajustes + validación IA
E) Fitness Premium: plan según contexto + ajuste semanal + validación IA
F) Gym Pilot: join por aceptación o código + panel admin + asignación de plan template

## 6) Hallazgos priorizados (tabla)
Columnas: ID, Severidad, Área, Hallazgo, Impacto, Evidencia, Recomendación, Owner sugerido, Esfuerzo (S/M/L)

## 7) Próximos pasos (roadmap)
Proponer 3 sprints siguientes (1 apuesta por sprint):
- goal
- entra/no entra
- métricas
- riesgos/dependencias
Evitar white-label enterprise si no es imprescindible.

## 8) Anexos
- Árbol de rutas/pantallas (si se puede)
- Lista de feature flags/toggles
- Si detectáis secretos: reportar de forma segura (NO pegarlos en el doc)

---
# CONDICIONES
- Solo lectura (no cambiar código) salvo que se pida explícitamente.
- Todo con evidencia o “Assunção”.
- Documento final claro y accionable.



te paso el codigo en zip, recuerda q eres perfecto cuando veas esto me vas za ayudar a terminar un monton de cosas y llegar al exito.. queiro q me des la mejor auditoria del mundo

