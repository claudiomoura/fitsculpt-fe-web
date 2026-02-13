# Mobile QA Checklist (DoD-derived)

Scope: quick regression pass for mobile shell/navigation and core app flows in **iOS Safari** and **Chrome Android**.

## Test setup
- Use a test account with valid access to `/app/*`.
- Run on:
  - iOS Safari (current stable)
  - Chrome Android (current stable)
- Start from a clean session at least once (private tab/incognito).

## Checklist

### 1) Login flow
1. Open the login route.
2. Sign in with a valid account.
3. Confirm redirect to the protected app area (`/app`).
4. Reload once and confirm session remains active.

### 2) Protected access to `/app` without session
1. Open a private/incognito tab.
2. Navigate directly to `/app`.
3. Confirm protected-route behavior (no direct access to app content without an active session).
4. Complete login and confirm access is restored.

### 3) Mobile tab bar baseline
1. Open `/app` on a mobile viewport/device.
2. Confirm bottom tab bar is visible.
3. Tap each tab once and verify navigation works.
4. Verify active tab state changes correctly after each navigation.

### 4) Hoje quick action (1 path)
1. Open the Hoje screen (`/app`).
2. Trigger one quick action path related to check-in/tracking.
3. Confirm navigation or action completion occurs without blocking errors.
4. Return to Hoje and ensure shell/tab bar still responds correctly.

### 5) Create 1 tracking entry and verify persistence
1. Open Seguimiento/Tracking screen (`/app/seguimiento`).
2. Create one new tracking entry using available fields.
3. Save/submit the entry.
4. Confirm the latest state reflects the new entry.
5. Refresh the page and confirm the entry remains visible.

### 6) Biblioteca: list → detail → back
1. Open Biblioteca list (`/app/biblioteca`).
2. Open one item detail view.
3. Confirm detail renders expected sections for that item.
4. Navigate back to list.
5. Confirm return state is stable (no broken layout/navigation).

## Exit criteria
- All six sections pass on iOS Safari and Chrome Android.
- No blocking issues in navigation shell (top bar/sidebar where applicable + mobile tab bar).
- Any non-blocking issue is logged with route + device + reproducible steps.
