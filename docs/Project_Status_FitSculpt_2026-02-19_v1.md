# FitSculpt – Project Status (Estricto) 2026-02-19

Branch de referencia: zips actuales (`front.zip`, `back.zip`)  
Owner: Founder/PM

## Estado global
- **Demo asistida:** Sí
- **Release-ready:** No
- **Gym vendible sin supervisión:** No (aún)

## Evidencia de lo sólido
- Backend CRUD de gyms (admin) existe: `POST/GET/DELETE /admin/gyms`. Evidencia: `back/src/index.ts` L7869-L7960.
- Front usa BFF para admin gyms: `front/src/app/api/admin/gyms/route.ts` (proxy). Evidencia: L1-L30.

## Riesgos operativos actuales
1) Contracts inconsistentes por envelopes (BFF envuelve arrays).
2) Parsing defensivo en FE (contratos no cerrados).
3) Duplicidad `/trainer` vs `/treinador`.
4) Build rojo por módulos no-core bloquea el Gym MVP.

## Regla de oro (operativa)
- No merge sin `npm run build` PASS (web y api). Cualquier excepción = rollback inmediato.

## Próxima fase recomendada (2–4 semanas)
- Convertir Gym Pilot en “rock-solid” desde contracts y DoD, no desde más pantallas.
- Métrica: flujo “crear gym → user join → trainer approve → user ACTIVE → members list” en <2 min, 0 errores consola.
