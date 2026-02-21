# Sprint 0 (UI/UX) – Auditoría y base de diseño

Fecha: 2026-01-29

Este sprint 0 se centra en dejar claro qué hay hoy, qué frena el “wow” visual, y qué cambios atacan más rápido la percepción de producto premium.

## 1) Lo que ya está implementado (funcional)

### Frontend (Next.js)
- Landing público con i18n (ES/EN) y CTA a login/app. (`src/app/(public)/page.tsx`)
- Auth:
  - Login, registro, verificación de email y reenvío de verificación. (`src/app/(auth)/*`)
  - Login con Google (incluye flujo de promo code). (`src/app/(auth)/login/GoogleLoginButton.tsx`)
- App shell:
  - Navbar con drawer en móvil, selector de idioma, tema, y menú de usuario. (`src/components/layout/AppNavBar.tsx`)
  - Sidebar por secciones, con filtrado de items admin. (`src/components/layout/AppSidebar.tsx`, `src/components/layout/navConfig.ts`)
- Dashboard (muy cercano al “Hoy”):
  - Resumen de entrenamiento y nutrición para hoy.
  - Anillos de progreso, badges de macros, gráficas simples (SVG) de peso y grasa. (`src/app/(app)/app/DashboardClient.tsx`)
- Biblioteca:
  - Lista y detalle de ejercicios, con filtros, búsqueda, y portada (placeholder si falta). (`src/app/(app)/app/biblioteca/*`)
  - Recetas (lista y detalle). (`src/app/(app)/app/biblioteca/recetas/*`)
  - Planes de entrenamiento (vista biblioteca). (`src/app/(app)/app/biblioteca/entrenamientos/*`)
- Plan de entrenamiento:
  - Generación “local” (no IA) según preferencias, calendario, y vista móvil con gestos.
  - Flujo IA (si se activa). (`src/app/(app)/app/entrenamiento/TrainingPlanClient.tsx`)
- Nutrición:
  - Plan, edición y vista de macros. (`src/app/(app)/app/nutricion/*`, `src/app/(app)/app/macros/*`)
- Seguimiento:
  - Checkins, comida, y paneles de progreso. (`src/app/(app)/app/seguimiento/*`)
- Perfil:
  - Resumen de perfil, edición vía onboarding, y subida de avatar (data URL). (`src/app/(app)/app/profile/*`)
- Ajustes + facturación:
  - Pantalla de billing conectada a /api/billing. (`src/app/(app)/app/settings/billing/*`)

### Backend (Fastify + Prisma)
- Auth: signup/register/login/logout, verify email, resend verification, change password.
- OAuth Google: start/callback.
- Profile: GET/PUT.
- Tracking: GET/PUT, delete.
- Foods personalizados: CRUD.
- IA: quota, training-plan, nutrition-plan, daily-tip (con control de tokens).
- Billing Stripe: checkout, portal, webhook, status/sync.
- Biblioteca: ejercicios/recetas, planes (training/nutrition).
- Workouts: CRUD básico + start/finish session.
- Admin: usuarios (listar/crear/verificar email/reset pass/borrar).
(Ver endpoints en `back/src/index.ts`, búsquedas por `app.get/app.post`.)

## 2) Lo que está mal o impide sensación “Apple-level”

### Problemas de percepción (impacto alto)
1) Inconsistencia de copy e i18n, hay pantallas totalmente traducidas y otras con texto hardcodeado, especialmente Billing.
2) Demasiados estilos inline, se repiten `marginTop`, `display:flex`, `gap`, etc. Eso hace que el diseño “parezca prototipo” aunque visualmente sea correcto.
3) Placeholders con nombres raros: en `public/placeholders/` hay assets con espacios y sufijos “Cópia”.
4) Componentes monolíticos: por ejemplo `TrainingPlanClient.tsx` mezcla UI, lógica de calendario, IA, pagos y modales. Para iterar UI rápido, esto complica.

### Problemas de calidad (impacto medio)
- Peticiones duplicadas de `/api/auth/me` en navbar y sidebar.
- Falta de debounce en búsquedas (biblioteca), y `limit=200` en client, puede sentirse pesado.
- Tipografía: está “bien”, pero no hay una escala clara (h1/h2/h3) ni tokens de spacing, y eso limita el look premium.

## 3) Quick wins que elevan el look sin tocar lógica
1) Unificar copy, títulos y vacíos (empty states) en todas las pantallas.
2) Quitar estilos inline repetidos, crear utilidades CSS simples (`.mt-16`, `.stack-12`, `.row-gap-12`), o componentes (CardHeader, EmptyState).
3) Asegurar consistencia móvil: barra superior, cards, botones, y siempre CTA visibles.
4) Crear un set de componentes premium mínimos:
   - `PageHeader`, `SectionHeader`, `StatCard`, `EmptyState`, `Pill`, `AvatarMenu`.
5) Preparar un flujo de demo de 3 minutos que siempre queda bien aunque el usuario no tenga datos.

## 4) Lista de pantallas para demo (orden recomendado)
1) Landing, login.
2) Dashboard (Hoy): entrenamiento y calorías, quick actions.
3) Plan entrenamiento (vista calendario + día).
4) Nutrición (plan y macros).
5) Biblioteca (ejercicio detalle).
6) Perfil (avatar + resumen).
7) Billing (PRO).

## 5) Criterio Done para UI/UX (para sprints 1-3)
- No hay texto hardcodeado en pantallas públicas, todo via i18n.
- No hay estilos inline repetidos, están en clases o componentes.
- Cada pantalla tiene:
  - título claro, subtítulo corto,
  - empty state útil,
  - CTA primaria clara,
  - layout responsive perfecto.
