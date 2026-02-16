# Sprint 24 / PR-C — Demo Script (< 2 min) + PASS/FAIL Checklist

## Objective
Validate the complete trainer/member operational flow in one short demo:
1. Member joins gym.
2. Admin accepts join request.
3. Trainer creates a plan.
4. Trainer adds exercises.
5. Trainer assigns plan to member.
6. Member sees assigned plan in **Plan** and **Hoy**.

---

## Demo script (target: 1m 45s)

### 0:00–0:15 — Member requests gym access
- Login as **Member** and open `/app/gym`.
- Enter gym join code and submit join request.
- Expected: member status becomes `PENDING`.

### 0:15–0:35 — Admin accepts request
- Login as **Admin** and open `/app/admin/gyms`.
- Open pending join requests and accept the member.
- Expected: request disappears from pending list and member appears as active.

### 0:35–1:05 — Trainer creates plan
- Login as **Trainer** and open trainer workspace (`/app/trainer` or `/app/treinador`).
- Create a new training plan for the accepted member.
- Expected: plan appears in trainer plan list with draft or active state.

### 1:05–1:25 — Trainer adds exercises
- Open the plan detail.
- Add at least 2 exercises (e.g., Squat + Push-up) to Day 1.
- Expected: exercises are listed and persisted after refresh.

### 1:25–1:40 — Trainer assigns plan
- Use assignment action for the target member.
- Expected: assignment confirmation appears (toast, badge, or status update).

### 1:40–1:45 — Member verifies Plan + Hoy
- Login back as **Member**.
- Open `/app/entrenamiento` (Plan) and `/app/hoy`.
- Expected: assigned plan is visible in Plan and reflected in Hoy summary/action cards.

---

## PASS/FAIL checklist

- [ ] **Join request submitted** from member gym page.
  - Pass criteria: request saved and member status is `PENDING`.
  - Fail examples: validation error, request not created, 4xx/5xx blocking flow.

- [ ] **Admin acceptance completed** from gym admin panel.
  - Pass criteria: pending request removed and member listed as active.
  - Fail examples: action button fails, stale pending item, membership not activated.

- [ ] **Training plan created** by trainer for selected member.
  - Pass criteria: plan exists with correct member linkage.
  - Fail examples: create call fails, plan not visible after reload.

- [ ] **Exercises added** to the newly created plan.
  - Pass criteria: minimum 2 exercises persist in selected day.
  - Fail examples: exercise save fails, items disappear after refresh.

- [ ] **Plan assigned** to member.
  - Pass criteria: assignment state updates successfully.
  - Fail examples: assignment endpoint fails or target member mismatch.

- [ ] **Member sees plan in Plan + Hoy**.
  - Pass criteria: same assigned plan appears in both screens.
  - Fail examples: plan only visible in one page, stale or empty Hoy card.

- [ ] **No blocker API errors during flow**.
  - Pass criteria: no blocking `404`/`405`/`500` in critical steps above.
  - Fail examples: any error preventing completion of end-to-end demo.

---

## Recording notes (short video)
- Capture one continuous recording (recommended 720p) showing the exact sequence above.
- Keep cuts/transitions minimal so total runtime stays under **2:00**.
- Suggested filename: `sprint24-pr-c-demo.mp4`.
- Attach together with this checklist in sprint QA evidence.
