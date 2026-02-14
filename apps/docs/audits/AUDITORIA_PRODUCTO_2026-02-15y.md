
# Auditoria_FitSculpt_2026-02-15.md

Fecha: 2026-02-15
Autor/a auditoría: Equipo Senior Staff Architects (auditoría asistida)
Solicitado por: Founder/PM (FitSculpt)
Motivo: Mapa completo y verificable de “qué existe hoy”, gaps del MVP modular, readiness para vender a un gym pequeño.

> Nota de evidencia:
>
> * “Evidencia código (zip)” = validado en los zips iniciales.
> * “Evidencia externa” = validado por logs, comandos y capturas que compartiste.
> * Si no hay prueba directa, queda como **Assunção**.

---

## 0) Addendum, cambios desde 2026-02-14

### Cerrado o parcialmente cerrado (según PRs y comandos ejecutados)

* **Prisma/GymMembership faltante**: se detectó que el backend estaba intentando leer `GymMembership` y la tabla no existía (crash). Se confirmó drift en Render y necesidad de corregir workflow de migrations (Evidencia externa: output `prisma migrate dev` con drift y prompt de reset).
* **Gym (usuario)**: la pantalla `/app/gym` muestra UI coherente para “no perteneces” y entrada por código (Evidencia externa: captura móvil reciente). En ese estado aparece “No hay gimnasios disponibles”, lo que indica que el endpoint de listado devuelve vacío o no está cableado.
* **Persisten fallos en Trainer/Admin en práctica**:

  * Errores 405 y 404 contra endpoints de upload y create exercises desde `capabilityAudit.ts` (Evidencia externa: logs de consola).
  * Warning de React por claves duplicadas `training` en `AppNavBar` y `AppSidebar` (Evidencia externa: logs de consola).
  * Admin ya no ve “todas las pantallas como antes” en el menú, al menos en el entorno actual (Evidencia externa: capturas y tu descripción).

---

## 1) Executive Summary (máx 12 bullets)

* **Estado general: Release-ready = NO**. Hay fallos funcionales visibles en consola y en superficies de Admin/Trainer (405/404, claves duplicadas de nav). Evidencia externa: logs de consola (POST /api/exercises 405, /api/media/upload 404, keys duplicadas `training`).
* **Estado MVP Modular = NO**. Sigue sin haber separación real de tiers por dominio (Nutrición Premium vs Fitness Premium vs Bundle vs Gym). Esto no se resuelve con los PRs recientes (Evidencia código zip: enum de plan Free/Pro, y gating actual por token/plan).
* **Estado Gym Pilot vendible = NO (aún)**. La UI de usuario existe, pero sin “crear gyms”, “listar gyms reales”, “aceptar solicitudes” y “trainer asigna plan a miembros”, el flujo no es demo end-to-end. Evidencia externa: la UI muestra “No hay gimnasios disponibles”, y no hay evidencia aún de panel admin operativo en tu entorno.
* **Top 5 riesgos actuales**

  1. Drift de Prisma en Render y migraciones modificadas tras aplicar, riesgo de despliegues bloqueados o inconsistentes (Evidencia externa: `migrate dev` drift).
  2. Trainer UI intenta capacidades inexistentes (POST a endpoints no soportados), degrada confianza en demo y ensucia consola (Evidencia externa: 405/404 desde `capabilityAudit.ts`).
  3. Navegación duplicada por keys, riesgo de render inconsistente y bugs en menú (Evidencia externa: duplicate key `training`).
  4. Admin no ve secciones como antes, riesgo de “no puedo operar el producto” durante demo (Evidencia externa: capturas y feedback).
  5. Gym “vacío” (sin gyms listados), bloquea el onboarding del gym (Evidencia externa: “No hay gimnasios disponibles”).
* **Top 5 quick wins (P0/P1)**

  1. Parar o rediseñar `capabilityAudit` para que no haga POST probes a endpoints no implementados, y que desactive UI con estado “No disponible” sin ruido.
  2. Dedupe de IDs de navegación, y keys robustas en render (resolver `training` duplicado).
  3. Alinear detección de rol admin en FE con payload real de `/api/auth/me`, o corregir payload BE si cambió, para que Admin recupere visibilidad de secciones.
  4. Añadir “Admin crea gym” y “List gyms” reales, para que el dropdown deje de estar vacío.
  5. Implementar flujo mínimo trainer: listar miembros del gym y asignar plan existente (clonado o link), sin IA.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

#### 2.1.1 Rutas core (alto nivel)

* Core usuario: Hoy, Panel/Dashboard, Seguimiento, Biblioteca, Nutrición, Dietas, Macros, Perfil, Ajustes (Evidencia código zip).
* Gym: `/app/gym` existe y muestra UI de membresía y código (Evidencia externa: captura).
* Admin/Trainer: existen rutas (Evidencia código zip), pero su accesibilidad y funcionamiento están inestables en tu entorno actual (Evidencia externa: “no veo la parte admin como antes”, logs de capability audit).

#### 2.1.2 Admin vs usuario final

* Intención de diseño: sidebar agrega secciones Admin y Development solo para admin (Evidencia código zip).
* Problema actual: en práctica, tu cuenta no muestra esas secciones como antes (Evidencia externa). Causas probables:

  * FE no está leyendo el rol correctamente del payload real (cambio en shape de `/auth/me`), o
  * el backend está fallando y el FE se queda sin flags (Assunção).

#### 2.1.3 Callejones sin salida detectados (actualizados)

* Trainer uploader y create exercises: UI intenta endpoints no implementados, provoca 405/404 y hace que “trainer falle” en demo (Evidencia externa).
* Gym: la UI del usuario no puede elegir gyms si la lista está vacía. Falta “crear gym” para poblar (Evidencia externa).

---

### 2.2 Flujos end-to-end (journeys)

> Nota: actualizo los journeys impactados por los PRs recientes y por los fallos nuevos.

#### Gym (usuario): elegir gym (dropdown) o unirse por código

* Estado actual visible:

  * UI muestra “Aún no perteneces a un gimnasio”.
  * Sección “Código del gimnasio” permite unirse con código.
  * “Solicitar acceso” aparece, pero cuando no hay gyms disponibles no puede completar el flujo.
* Gap:

  * Listado de gyms devuelve vacío o no está implementado/cableado. Sin “admin create gym” no hay datos.
* Evidencia externa: captura móvil con “No hay gimnasios disponibles en este momento”.

#### Trainer: asignar planes a usuarios del mismo gym

* Estado actual:

  * La zona trainer “falla” (según tu feedback).
  * Además hay spam 405/404 por capability audit, lo que indica que el FE intenta acciones no soportadas.
* Gap:

  * No hay un flujo real “trainer ve miembros del gym” + “asigna plan”.
  * Incluso si el backend ya tiene GymMembership, faltan endpoints de trainer y wiring de FE.
* Evidencia externa: logs `POST /api/exercises 405`, `POST /api/media/upload 404`.

---

### 2.3 Matriz de entitlements

* Sin cambios de fondo respecto a 2026-02-14: Free/Pro y control por tokens, no modular por dominio ni por gym (Evidencia código zip).
* Si se añadió “Gym” como concepto en DB (GymMembership), todavía no hay evidencia de tier comercial “Gym” implementado end-to-end (Evidencia externa indica que aún no funciona en práctica).

---

## 3) Auditoría UX (mobile-first), actualización

### 3.1 Tab bar y navegación

* Sigue habiendo un problema de overflow en móvil en tu entorno (“solo se ven 3 iconos”). Esto es P0 porque impacta demo.
* Evidencia externa: captura anterior y descripción.

### 3.2 Estados loading/empty/error

* Gym user UI: estado vacío correcto (no fake), pero ahora hay que desbloquear el origen de datos (crear gyms) para no quedarse en empty siempre (Evidencia externa).

### 3.3 Fricciones nuevas (top 5)

1. Spam de consola por capability audit, se percibe como app rota.
2. Nav keys duplicadas `training`, riesgo de UI inconsistente.
3. Tab bar no cabe en móvil pequeño.
4. Admin no ve secciones, pierde control.
5. Gym sin datos, no se puede probar dropdown.

---

## 4) Auditoría de Arquitectura y Contratos, actualización

### 4.1 Backend, Prisma drift (nuevo hallazgo P0)

* Se detectó drift: una migration aplicada fue modificada, y el esquema real de la DB no coincide con el historial de migrations.
* Consecuencia: `prisma migrate dev` en Render propone reset, lo que no es aceptable con datos.
* Evidencia externa: output completo de `npx prisma migrate dev` con drift y prompt de reset.

### 4.2 Contratos BFF y endpoints faltantes (nuevo foco)

* En práctica, el FE hace POST contra:

  * `/api/exercises` (405)
  * `/api/exercises/upload` (405)
  * `/api/media/upload` (404)
  * `/api/uploads` (404)
* Lectura arquitectónica:

  * O bien esos endpoints no existen en BFF, o existen solo GET y el FE no debe postear.
  * Mientras no haya backend real de upload, esos botones deben estar deshabilitados y el audit no debe probar POST.
* Evidencia externa: logs de consola.

---

## 5) Calidad y Release Readiness, actualización

### 5.1 Evidencia técnica (actual)

* Prisma: drift confirmado en Render (P0).
* Runtime trainer/admin: errores 405/404 y duplicate keys en navegación (P0).
* Build: no tengo el output final de `npm run build` post-PR en web y api, así que no lo marco como PASS de forma definitiva (Assunção: el build web ya no falla por i18n si se aplicó el fix).

### 5.2 Checklist DoD + Gym

* DoD core (login, /app, tracking, biblioteca): sin nueva evidencia en esta iteración, se mantiene como antes (Evidencia código zip).
* Gym Pilot: FAIL en práctica hasta que existan:

  * Admin crea gym, lista gyms, join request accept/reject, trainer asigna plan, y el usuario ve el plan (Evidencia externa actual: gyms empty, trainer falla).

---

## 6) Hallazgos priorizados (tabla), actualizado
| ID     | Severidad | Área       | Hallazgo                                                                  | Impacto                                                        | Evidencia                                         | Recomendación                                                                                               | Owner sugerido     | Esfuerzo |
| ------ | --------- | ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| FS-010 | P0        | Backend/DB | Drift Prisma en Render, migration aplicada modificada                     | Bloquea migraciones seguras, riesgo de reset o inconsistencias | Evidencia externa: `migrate dev` drift            | Estándar: nunca editar migrations aplicadas, usar `migrate deploy` en Render, plan de reparación controlado | Backend/DevOps     | M        |
| FS-011 | P0        | Trainer UX | `capabilityAudit` hace POST probes a endpoints no implementados (405/404) | Trainer “parece roto”, consola sucia, demo mala                | Evidencia externa: logs 405/404                   | Quitar probes POST, desactivar UI, solo detectar por GET o por capabilities en `/auth/me`                   | Frontend           | S        |
| FS-012 | P0        | Navegación | Keys duplicadas `training` en AppNavBar/AppSidebar                        | Render inestable, warnings                                     | Evidencia externa: logs                           | Dedupe de secciones y keys compuestas, evitar ids duplicadas                                                | Frontend           | S        |
| FS-013 | P0        | Mobile     | Tab bar overflow, solo 3 iconos visibles                                  | Demo móvil mala, UX rota                                       | Evidencia externa: capturas                       | Ajustar CSS, min-width 0, truncado, gap responsive                                                          | Frontend           | S        |
| FS-014 | P0        | Gym        | No hay gyms listados, dropdown no sirve                                   | No se puede enrolar desde lista                                | Evidencia externa: “No hay gimnasios disponibles” | Implementar Admin create gym y GET gyms real, seed mínimo                                                   | Backend + Frontend | M        |
| FS-015 | P1        | Admin      | Admin dejó de ver secciones como antes                                    | No puede operar producto                                       | Evidencia externa                                 | Alinear lectura de rol del payload `/auth/me` y gating                                                      | Frontend + Backend | S        |
                                                   | Frontend + Backend | S        |

---

## 7) Próximos pasos (roadmap), actualizado a tu prioridad “Gym vendible”

### Sprint A (P0), “Demo móvil estable + Admin visible + trainer sin ruido”

Goal: demo sin vergüenza, sin warnings, sin endpoints rotos en trainer, tab bar ok.
Entra:

* Parar capability probes POST, y deshabilitar UI de upload/create si no existe backend.
* Dedupe de nav keys `training`.
* Fix tab bar overflow.
* Admin visible siempre que rol sea admin, ajustando parsing de `/auth/me`.
  Métricas:
* 0 requests 405/404 en consola en navegación normal.
* 0 warnings de duplicate keys.
* Tab bar visible completa en 320px.

### Sprint B (P0), “Gym backend mínimo operativo”

Goal: el dropdown tenga gyms, y existan memberships reales.
Entra:

* Admin create gym (join code).
* GET gyms para usuario.
* Join request (PENDING) y join by code (ACTIVE).
* Accept/reject requests.
  Métrica:
* Un usuario se une por código en < 30s.
* Un admin crea un gym y ve join code en < 30s.

### Sprint C (P0), “Trainer asigna plan a miembros del gym”

Goal: valor vendible para gym pequeño.
Entra:

* Trainer ve miembros del gym.
* Trainer asigna plan existente (template) a un miembro.
* Miembro ve el plan en Plan y/o Hoy.
  Métrica:
* Flujo completo en < 2 minutos en demo.

---

## 8) Anexos

### 8.1 Evidencias externas usadas en este addendum

* Logs de consola: 405/404 en `/api/exercises`, `/api/exercises/upload`, `/api/media/upload`, `/api/uploads`, y warning de duplicate key `training`.
* Output de `npx prisma migrate dev` con drift y prompt de reset.
* Captura de `/app/gym` mostrando estado “no perteneces” y “no hay gimnasios disponibles”.

---

Fin del documento.

---
