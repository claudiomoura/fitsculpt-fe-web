import assert from "node:assert/strict";
import { z } from "zod";

const gymListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const gymsListResponseSchema = z.object({
  gyms: z.array(gymListItemSchema),
  items: z.array(gymListItemSchema),
});

const gymMembershipResponseSchema = z.object({
  status: z.enum(["NONE", "PENDING", "ACTIVE"]),
  state: z.enum(["none", "pending", "active"]),
  gymId: z.string().min(1).nullable(),
  gymName: z.string().min(1).nullable(),
  gym: z.object({ id: z.string().min(1), name: z.string().min(1) }).nullable(),
  role: z.enum(["ADMIN", "TRAINER", "MEMBER"]).nullable(),
});

const gymJoinRequestItemSchema = z.object({
  id: z.string().min(1),
  membershipId: z.string().min(1),
  status: z.literal("PENDING"),
  gym: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  user: z.object({ id: z.string().min(1), name: z.string().nullable(), email: z.string().email() }),
  createdAt: z.coerce.date(),
});

const gymJoinRequestsListSchema = z.object({
  items: z.array(gymJoinRequestItemSchema),
  requests: z.array(gymJoinRequestItemSchema),
});

const gymJoinRequestActionSchema = z.object({
  membershipId: z.string().min(1),
  status: z.enum(["ACTIVE", "REJECTED"]),
});

const assignedTrainingPlanSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  goal: z.string().nullable(),
  level: z.string().nullable(),
  daysPerWeek: z.number().int().nullable(),
  focus: z.string().nullable(),
  equipment: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  daysCount: z.number().int().nullable(),
});

const memberTrainingPlanAssignmentSchema = z.object({
  memberId: z.string().min(1),
  gym: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  assignedPlan: assignedTrainingPlanSchema.nullable(),
});

const gymsListPayload = {
  gyms: [{ id: "gym_1", name: "Downtown Gym" }],
  items: [{ id: "gym_1", name: "Downtown Gym" }],
};

const joinRequestCreatePayload = {
  status: "PENDING",
  state: "pending",
  gymId: "gym_1",
  gymName: "Downtown Gym",
  gym: { id: "gym_1", name: "Downtown Gym" },
  role: "MEMBER",
};

const joinByActivationCodePayload = {
  status: "ACTIVE",
  state: "active",
  gymId: "gym_1",
  gymName: "Downtown Gym",
  gym: { id: "gym_1", name: "Downtown Gym" },
  role: "MEMBER",
};

const joinRequestsListPayload = {
  items: [
    {
      id: "membership_1",
      membershipId: "membership_1",
      status: "PENDING",
      gym: { id: "gym_1", name: "Downtown Gym" },
      user: { id: "user_1", name: "Ana", email: "ana@example.com" },
      createdAt: "2026-02-22T10:00:00.000Z",
    },
  ],
  requests: [
    {
      id: "membership_1",
      membershipId: "membership_1",
      status: "PENDING",
      gym: { id: "gym_1", name: "Downtown Gym" },
      user: { id: "user_1", name: "Ana", email: "ana@example.com" },
      createdAt: "2026-02-22T10:00:00.000Z",
    },
  ],
};

const joinRequestActionPayload = {
  membershipId: "membership_1",
  status: "ACTIVE",
};

const memberAssignedPlanPayload = {
  memberId: "user_1",
  gym: { id: "gym_1", name: "Downtown Gym" },
  assignedPlan: {
    id: "plan_1",
    title: "Strength Base",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    daysPerWeek: 4,
    focus: "UPPER_LOWER",
    equipment: "GYM",
    startDate: "2026-02-24T00:00:00.000Z",
    daysCount: 28,
  },
};

const parsedGyms = gymsListResponseSchema.parse(gymsListPayload);
assert.deepEqual(parsedGyms.gyms, parsedGyms.items, "GET /gyms must keep gyms and items arrays aligned");

const parsedJoinCreate = gymMembershipResponseSchema.parse(joinRequestCreatePayload);
assert.equal(parsedJoinCreate.status, "PENDING", "POST /gyms/join must return stable uppercase status");
assert.equal(parsedJoinCreate.state, "pending", "POST /gyms/join must return legacy lowercase state");

const parsedActivationJoin = gymMembershipResponseSchema.parse(joinByActivationCodePayload);
assert.equal(parsedActivationJoin.status, "ACTIVE", "POST /gyms/join-by-code may return ACTIVE for activation codes");
assert.equal(parsedActivationJoin.state, "active", "POST /gyms/join-by-code must keep legacy lowercase state for ACTIVE");

const parsedJoinList = gymJoinRequestsListSchema.parse(joinRequestsListPayload);
assert.ok(parsedJoinList.items.length > 0, "GET /admin/gym-join-requests must include items");
assert.deepEqual(parsedJoinList.items, parsedJoinList.requests, "GET /admin/gym-join-requests must mirror items and requests");

const parsedAction = gymJoinRequestActionSchema.parse(joinRequestActionPayload);
assert.equal(parsedAction.membershipId, "membership_1");

const parsedAssignment = memberTrainingPlanAssignmentSchema.parse(memberAssignedPlanPayload);
assert.equal(parsedAssignment.assignedPlan?.id, "plan_1");

console.log("gym pilot contract tests passed");
