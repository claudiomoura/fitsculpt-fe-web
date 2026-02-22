# Gym Pilot BFF↔BE Contracts

This document captures the current **stable response shapes** used by Gym Pilot flows and protected by contract tests.

## 1) Gyms list

Endpoint: `GET /gyms`

Official contract (backend): returns both `gyms` and `items` wrappers with the same array.

```json
{
  "gyms": [
    { "id": "gym_1", "name": "Downtown Gym" }
  ],
  "items": [
    { "id": "gym_1", "name": "Downtown Gym" }
  ]
}
```

## 2) Gym join request create

Endpoints: `POST /gyms/join` and alias `POST /gym/join-request`

Official contract: returns normalized membership payload with stable + legacy status fields.

```json
{
  "status": "PENDING",
  "state": "pending",
  "gymId": "gym_1",
  "gymName": "Downtown Gym",
  "gym": { "id": "gym_1", "name": "Downtown Gym" },
  "role": "MEMBER"
}
```

## 3) Admin join requests list

Endpoint: `GET /admin/gym-join-requests`

Official contract: returns `items` and backward-compatible `requests` arrays with same payload.

```json
{
  "items": [
    {
      "id": "membership_1",
      "membershipId": "membership_1",
      "status": "PENDING",
      "gym": { "id": "gym_1", "name": "Downtown Gym" },
      "user": { "id": "user_1", "name": "Ana", "email": "ana@example.com" },
      "createdAt": "2026-02-22T10:00:00.000Z"
    }
  ],
  "requests": [
    {
      "id": "membership_1",
      "membershipId": "membership_1",
      "status": "PENDING",
      "gym": { "id": "gym_1", "name": "Downtown Gym" },
      "user": { "id": "user_1", "name": "Ana", "email": "ana@example.com" },
      "createdAt": "2026-02-22T10:00:00.000Z"
    }
  ]
}
```

## 4) Admin join request actions

Endpoints:
- `POST /admin/gym-join-requests/:membershipId/accept`
- `POST /admin/gym-join-requests/:membershipId/reject`

Official contract:

```json
{
  "membershipId": "membership_1",
  "status": "ACTIVE"
}
```

(For reject action `status` is `REJECTED`.)

## 5) Member assigned plan

Endpoint: `GET /trainer/members/:userId/training-plan-assignment`

Official contract:

```json
{
  "memberId": "user_1",
  "gym": { "id": "gym_1", "name": "Downtown Gym" },
  "assignedPlan": {
    "id": "plan_1",
    "title": "Strength Base",
    "goal": "MUSCLE_GAIN",
    "level": "INTERMEDIATE",
    "daysPerWeek": 4,
    "focus": "UPPER_LOWER",
    "equipment": "GYM",
    "startDate": "2026-02-24T00:00:00.000Z",
    "daysCount": 28
  }
}
```

`assignedPlan` can be `null` when no plan is assigned.
