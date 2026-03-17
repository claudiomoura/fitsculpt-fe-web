# Smoke Test oficial RC (PASS/FAIL)

**Owner:** Equipo Plataforma + QA  
**Dependency statement:** Depends on PR-01 to reference the real CI gates.

Objetivo: validar en menos de 10 minutos los flujos críticos del RC con un resultado binario por flujo (PASS/FAIL) y evidencia mínima.

## Pre-requisitos
1. FE corriendo en local.
2. API/BFF disponible y autenticación operativa.
3. Navegador en incógnito con DevTools (Console + Network) abierto.

## Regla global PASS/FAIL
- El smoke completo es **PASS** solo si todos los flujos obligatorios están en PASS.
- Si hay error de consola o request crítica con fallo inesperado (4xx/5xx), el flujo es **FAIL**.

## Flujos oficiales (6 obligatorios + 1 opcional)

### 1) Login (email/password)
**PASS** si: login exitoso, redirección correcta a `/app`, sesión activa.  
**FAIL** si: no autentica con credenciales válidas o hay errores de consola.

### 2) Navegación a `/app` (rutas core)
**PASS** si: se puede navegar por rutas core sin crash ni pantalla en blanco.  
**FAIL** si: rota la navegación o aparecen errores de consola.

### 3) Generar plan IA de entrenamiento
**PASS** si: request devuelve **200** y el plan persiste al recargar.  
**FAIL** si: status distinto de 200, no persiste, o hay error crítico en consola/network.

### 4) Generar plan IA de nutrición
**PASS** si: request devuelve **200** y el plan persiste al recargar.  
**FAIL** si: status distinto de 200, no persiste, o hay error crítico en consola/network.

### 5) Biblioteca → detalle de ejercicio
**PASS** si: lista abre, detalle abre y no hay crash.  
**FAIL** si: no carga, rompe en detalle, o hay error crítico en consola.

### 6) Estado de plan en header (Free/Pro)
**PASS** si: el estado mostrado es coherente con el usuario de prueba.  
**FAIL** si: inconsistencia de estado, datos vacíos inesperados o error de render.

### 7) (Opcional) Crear 1 registro de tracking y validar persistencia
**PASS** si: se crea 1 registro y sigue visible tras refresh.  
**FAIL** si: no guarda o desaparece sin motivo.

## Evidencia mínima por corrida
- Captura de resultado final PASS/FAIL.
- Captura de Console (sin errores para PASS).
- Captura de Network para flujos IA (status 200 + persistencia).
- Enlace al PR donde se reporta la corrida.

## Registro de resultado
Copiar en la descripción del PR:

```md
Smoke Test RC
- Fecha:
- Entorno:
- Resultado final: PASS | FAIL
- Flujos:
  - Login: PASS | FAIL
  - Navegación /app: PASS | FAIL
  - IA entrenamiento (200 + persistencia): PASS | FAIL
  - IA nutrición (200 + persistencia): PASS | FAIL
  - Biblioteca detalle: PASS | FAIL
  - Header Free/Pro: PASS | FAIL
  - Tracking opcional: PASS | FAIL | N/A
- Evidencia: <links>
```
