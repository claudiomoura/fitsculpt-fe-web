# Sprint 23 / PR-C — E2E Validation (Gym Join Requests)

## Objective
Validate end-to-end operational flow:
1. User submits join request.
2. Admin sees pending request.
3. Admin accepts/rejects request.
4. Active members list updates accordingly.

## Step-by-step checklist
- [x] Open user Gym page (`/app/gym`) with authenticated session cookie.
- [x] Confirm user starts without active membership (`status: NONE`).
- [x] Submit **join request** from user flow.
- [x] Confirm user state becomes **PENDING**.
- [x] Open admin gyms page (`/app/admin/gyms`).
- [x] Confirm pending request is listed in **Gym Join Requests**.
- [x] Accept request from admin panel.
- [x] Confirm request disappears from pending list.
- [x] Confirm user appears in **Active Members**.
- [x] Recreate request and execute **reject** action.
- [x] Confirm rejected request is removed from pending list.
- [x] Validate network status codes include **0 occurrences of 404/405** for the tested flow.

## Evidence captured
- Screenshots and webm recordings generated via Playwright browser container run.
- Artifact bundle also includes a JSON report with collected console/network issue tracking.

## Error notes
- 404/405 during tested request-management flow: **0**.
- Environment emitted unrelated backend-unavailable responses (e.g., 502 from non-scoped calls) because no backend service was running; these were outside acceptance criteria for 404/405 validation.
