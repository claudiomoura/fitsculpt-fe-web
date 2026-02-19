# Auditoria_FitSculpt_2026-02-19.md
Fecha: 2026-02-19  
Autor/a auditoría: GPT-5.2 Thinking (Senior Staff Architects)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Actualización de estado basada en docs recientes + señales de regresión en build reportadas por el founder.

> Alcance de esta actualización: **delta** sobre la auditoría 2026-02-18. No re-audita todo el repo desde cero. Donde no hay evidencia en los zips/docs aportados, queda marcado como **Assunção** o **Reporte del founder**.

---

## 1) Executive Summary (update)
- **Estado general (Release-ready): NO**. Hay regresiones de build TypeScript en frontend reportadas por el founder (2026-02-19), lo cual bloquea deploy/demo fiable. (**Reporte del founder**).
- **Estado Gym Pilot (vendible ASAP): NO aún**. El flujo admin gyms y contratos Gym siguen siendo el eje; además el frontend presenta crashes/errores de runtime recientes en `/app/admin/gyms` (gyms.find) según logs del founder. (**Reporte del founder**).
- **Docs de estado declaran build “verde” en branch `work` el 2026-02-14**, lo que sugiere divergencia entre branch/PRs y el estado actual en la máquina local. Evidencia: `docs/PROJECT_STATUS.md` L10-L14.

**Top 5 riesgos actuales (P0-P1)**
1. Regresiones de build recurrentes por cambios no validados con `npm run build` antes de merge (P0).
2. Contratos FE↔BFF↔BE Gym inestables o mal consumidos (P0): parsing heurístico y wrappers inconsistentes derivan en crashes.
3. Falta de “guard rails” en UI core (P0): `.find/.map` sobre payload no-array tumba pantallas críticas.
4. Dispersión de fuentes de verdad entre docs, branch `work`, y rama actual (P1): dificulta coordinar 3 equipos.
5. Scope creep en trainer/plans sin BE contract cerrado (P1): riesgo de UI fake o no persistente.

**Top 5 quick wins (48h)**
1. Instituir **Build Triage** obligatorio (P0): 1 error, 1 fix mínimo, `npm run build` PASS, merge.
2. “Contract wrapper normalizer” en BFF (P0): para rutas Gym/Admin, garantizar shape estable o status != 200 en error.
3. “No-crash guards” en pantallas core (P0): estados iniciales `[]`, `Array.isArray` y error state separado.
4. Congelar branch demo: `demo/stable` solo con commits que pasen build y smoke manual (P0).
5. Checklist de validación manual de 10 min antes de merge (P0) basado en `docs/DEFINITION_OF_DONE.md`.

---

## 2) Qué cambió según docs recientes (evidencia)
Fuente principal: `docs/PROJECT_STATUS.md` (fecha en doc: 2026-02-14).
- Se reporta que **`next build` fue desbloqueado** tras corregir i18n e interpolación `t(key, values)` (doc afirma build verde). Evidencia: `docs/PROJECT_STATUS.md` L10-L14.
- Se reportan fixes UX relevantes para demo: dedupe de músculos (evitar keys duplicadas) y overflow del tab bar en 320px. Evidencia: `docs/PROJECT_STATUS.md` L10-L14.

**Implicación**: si hoy tu máquina falla build por TS en componentes marketing, probablemente estás en una rama distinta o con merges incompletos respecto a lo descrito en `branch de referência: work`.

---

## 3) Estado actual observado (2026-02-19)
### 3.1 Build web
- `next build` falla en frontend por errores TypeScript en componentes marketing y/o cambios recientes (ej. `MarketingHeader.tsx` según logs). (**Reporte del founder**, logs pegados en chat).
- Además, se observó un crash runtime en `/app/admin/gyms` por `gyms.find is not a function` previamente. (**Reporte del founder**).

### 3.2 Riesgo operativo inmediato
- Aunque se arregle un error puntual, **aparecen errores encadenados**. Esto indica: (a) falta de PR discipline, (b) tipos demasiado estrictos o incoherentes, (c) cambios manuales sin ejecutar build local, o (d) mezcla de ramas.

---

## 4) Recomendación ejecutiva: plan mínimo para vender Gym ASAP
### 4.1 Congelar demo y parar sangría de build (P0, hoy)
- Crear rama `demo/stable` y **solo** permitir merges con evidencia de `npm run build` PASS.
- Aplicar política: **cualquier fix manual** debe ir como PR pequeño con output de build en descripción.
- Añadir pre-push / CI local rápido (Assunção si no existe CI): script `npm run build` obligatorio.

### 4.2 Volver a enfocarse en el core Gym (P0, 48-72h)
- Cerrar el loop vendible (admin create/delete, user join/leave, trainer approve, members list) con contratos estables.
- Paralelizar: B (BE contracts), C (BFF alignment), A (UI states + no-crash).
- Todo lo demás (plans/clients/multi-add) se reintroduce después de que Gym sea estable.

---

## 5) Acciones concretas para hoy (checklist)
1. Confirmar rama/commit: `git rev-parse --abbrev-ref HEAD` y `git rev-parse HEAD` (pegar en canal interno).
2. Ejecutar en limpio: `npm ci` (o `npm install` si no hay lock estable) y luego `npm run build`.
3. Si build falla: aplicar Build Triage hasta PASS, sin mezclar features.
4. Revalidar rutas de venta: `/app/admin/gyms`, `/app/gym`, `/app/trainer/*` con un smoke de 10 min.
5. Solo entonces retomar Sprint 2B/3.

---

## 6) Anexo: Evidencia en docs (extractos)
`docs/PROJECT_STATUS.md` L10-L14 (extracto):
```
## 0) Changelog recente (o que mudou desde a última versão)
### P0 (Release e demo)
- Build web voltou a ficar verde ao corrigir i18n (suporte a interpolação em `t(key, values)`), desbloqueando `next build`.
- Biblioteca: correção de keys duplicadas em badges (dedupe de músculos) para eliminar warnings e instabilidade de render.
- Tab bar mobile: removido overflow horizontal em ecrãs pequenos (320px), melhorando demo mobile.
```

---

## 7) Nota de limitación de esta actualización
- El zip `front.zip` aportado en esta conversación no contiene el archivo `MarketingHeader.tsx` que aparece en tus logs locales, por lo que no puedo validar el estado exacto del código que estás ejecutando ahora mismo. Por eso, todo lo relativo a ese error queda como **Reporte del founder**.
- Si quieres que marque “VALIDADO con evidencia” el estado actual, necesito el zip de la rama exacta que estás ejecutando (o export del folder `apps/web` si es monorepo).
