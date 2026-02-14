# DoD Manual Checklist (Mobile)

Objective: repeatable release-candidate manual verification for mobile web, focused on navigation shell stability and core user paths.

## Devices / browsers

- iOS Safari (stable)
- Android Chrome (stable)

Run at least one full pass in a clean private/incognito session.

## Preconditions

- Test account with access to `/app/*`.
- App deployed/running with current RC candidate.
- Network stable enough to complete authenticated flows.

## Checklist

### 1) Login and session continuity
1. Open login page.
2. Sign in with valid credentials.
3. Confirm redirect into `/app` protected area.
4. Reload once; confirm session remains active.

### 2) Protected access behavior (no active session)
1. Open private/incognito tab.
2. Navigate directly to `/app`.
3. Confirm protected-route behavior (no direct app access without session).
4. Complete login and confirm access is restored.

### 3) Navigation shell (mobile baseline)
1. Open `/app` on mobile viewport/device.
2. Confirm bottom tab bar is visible.
3. Tap each tab once and confirm navigation works.
4. Confirm active-tab state updates correctly.

### 4) Navigation accordion default state (“En desarrollo”)
1. Open app navigation where section groups are shown.
2. Confirm section **“En desarrollo”** appears **collapsed by default**.
3. Expand it manually and confirm links are visible.
4. Collapse it again and confirm interaction remains stable.

### 5) Hoje quick action sanity path
1. Open Hoje (`/app/hoy` when available in navigation).
2. Trigger one quick action related to check-in/tracking.
3. Confirm action completes or routes without blocking errors.
4. Return to Hoje and confirm navigation shell remains responsive.

### 6) Tracking write + persistence
1. Open Seguimiento (`/app/seguimiento`).
2. Create one tracking entry with available fields.
3. Save the entry.
4. Confirm latest state reflects the new entry.
5. Refresh page and confirm entry persists.

### 7) Biblioteca stability path
1. Open Biblioteca list (`/app/biblioteca`).
2. Enter one detail page.
3. Confirm expected detail sections render.
4. Return to list.
5. Confirm layout and navigation remain stable.

## Exit criteria

- All checklist sections pass on iOS Safari and Android Chrome.
- No blocking issues in mobile navigation shell.
- Any non-blocking issue is logged with route + browser/device + reproduction steps.
