# Sprint 22 / PR-C — QA Checklist (Navigation + Console)

## Scope
- Core app navigation sanity on protected routes.
- Role-based navigation visibility (admin vs non-admin).
- Browser console/page errors related to nav/role flows.
- Production build verification.

## Environment used
- Front-end: `npm run dev --prefix apps/web -- --port 3000`
- Browser automation: Playwright (Firefox) against `http://127.0.0.1:3000`
- Auth simulation:
  - Unauthenticated: no `fs_token` cookie
  - Authenticated: `fs_token=mock-token`
  - Role payload mocked only for `/api/auth/me`

## Reproducible QA checklist

### 1) Login works
**Status:** PASS

**How to reproduce**
1. Open `/login`.
2. Confirm login form renders.

**Automation evidence**
- Playwright run confirmed `login_form: true`.

---

### 2) `/app` is protected
**Status:** PASS

**How to reproduce**
1. Open a fresh browser context without cookies.
2. Navigate to `/app`.
3. Confirm redirect to `/login?next=%2Fapp`.

**Automation evidence**
- Redirect URL observed: `http://127.0.0.1:3000/login?next=%2Fapp`.

---

### 3) Navigation works for Hoy / Panel / Seguimiento / Biblioteca / Gimnasio
**Status:** PASS

**How to reproduce**
1. Set `fs_token` cookie in browser.
2. Visit, in order:
   - `/app/hoy` (Hoy)
   - `/app/dashboard` (Panel)
   - `/app/seguimiento`
   - `/app/biblioteca`
   - `/app/gym` (Gimnasio)
3. Confirm each route renders and navigation remains responsive.

**Automation evidence**
- Sequential route navigation completed without console/page errors.

---

### 4) Admin sees Admin/Trainer/Dev; non-admin does not
**Status:** PASS

**How to reproduce**
1. Mock `/api/auth/me` as admin (`roles`: ADMIN/TRAINER/DEV) and open `/app/hoy`.
2. Confirm admin/trainer/dev links are present in navigation.
3. Mock `/api/auth/me` as user (`roles`: USER) and reopen `/app/hoy`.
4. Confirm admin/trainer/dev links are absent.

**Automation evidence**
- Admin run: `admin_links: 12`, `trainer_links: 14`, `dev_link: 2`.
- Non-admin run: all counts `0`.

---

### 5) 0 console errors related to nav/role
**Status:** PASS

**How to reproduce**
1. Use authenticated context (`fs_token`) with mocked `/api/auth/me`.
2. Navigate through the core routes listed in step 3.
3. Record both browser `console.error` and `pageerror` events.
4. Assert both counts are zero.

**Automation evidence**
- Admin: `console=0`, `page=0`.
- User: `console=0`, `page=0`.

---

### 6) Build
**Status:** PASS

**Command**
```bash
npm run build --prefix apps/web
```

**Result**
- Build completed successfully.

## Notes
- Role checks were validated in browser automation by mocking `/api/auth/me` to keep the run deterministic.
- This checklist is reproducible locally with the same command sequence above.
