import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerProfileRoutes } from "../routes/profile.js";

const persistedProfiles = new Map<string, Record<string, unknown>>();
persistedProfiles.set("user_test", {
  name: "Member",
  sex: "male",
  age: 31,
  heightCm: 178,
  weightKg: 82,
  activity: "moderate",
  goal: "maintain",
  profilePhotoUrl: "data:image/png;base64,old",
  avatarDataUrl: "data:image/png;base64,old",
  trainingPreferences: {
    level: "intermediate",
    daysPerWeek: 4,
  },
});
persistedProfiles.set("user_nested", {
  profile: {
    profile: {
      name: "Nested member",
      goal: "bulk",
      trainingPreferences: {
        level: "advanced",
        daysPerWeek: 5,
      },
      profilePhotoUrl: "data:image/png;base64,nested",
      avatarDataUrl: "data:image/png;base64,nested",
    },
  },
});

const app = Fastify();

registerProfileRoutes(app, {
  prisma: {
    userProfile: {
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const profile = persistedProfiles.get(where.userId);
        return profile ? { profile } : null;
      },
      upsert: async ({ where, create, update }: {
        where: { userId: string };
        create: { profile: Record<string, unknown> };
        update: { profile: Record<string, unknown> };
      }) => {
        const next = update?.profile ?? create.profile;
        persistedProfiles.set(where.userId, next);
        return { profile: next };
      },
    },
  },
  requireUser: async (request) => ({
    id: (request.headers["x-test-user-id"] as string | undefined) ?? "user_test",
    name: "Member",
    email: "member@example.com",
    plan: "PRO",
  } as any),
});

const updatePlanResponse = await app.inject({
  method: "PUT",
  url: "/profile",
  payload: {
    trainingPlan: {
      title: "Plan semanal",
      days: [],
    },
  },
});

assert.equal(updatePlanResponse.statusCode, 200);
const updatePlanBody = updatePlanResponse.json() as { profile: Record<string, unknown> };
assert.equal(updatePlanBody.profile.age, 31);
assert.equal(updatePlanBody.profile.profilePhotoUrl, "data:image/png;base64,old");
assert.deepEqual(updatePlanBody.profile.trainingPlan, { title: "Plan semanal", days: [] });

const removeAvatarResponse = await app.inject({
  method: "PUT",
  url: "/profile",
  payload: {
    profilePhotoUrl: null,
    avatarDataUrl: null,
  },
});

assert.equal(removeAvatarResponse.statusCode, 200);
const removeAvatarBody = removeAvatarResponse.json() as { profile: Record<string, unknown> };
assert.equal(removeAvatarBody.profile.profilePhotoUrl, null);
assert.equal(removeAvatarBody.profile.avatarDataUrl, null);
assert.equal(removeAvatarBody.profile.age, 31);

const getProfileResponse = await app.inject({
  method: "GET",
  url: "/profile",
});

assert.equal(getProfileResponse.statusCode, 200);
const getProfileBody = getProfileResponse.json() as {
  id: string;
  profile: Record<string, unknown>;
};
assert.equal(getProfileBody.id, "user_test");
assert.equal(getProfileBody.profile.profilePhotoUrl, null);
assert.equal(getProfileBody.profile.age, 31);

const nestedUpdateResponse = await app.inject({
  method: "PUT",
  url: "/profile",
  headers: {
    "x-test-user-id": "user_nested",
  },
  payload: {
    profile: {
      profile: {
        trainingPreferences: {
          level: "intermediate",
        },
      },
    },
  },
});

assert.equal(nestedUpdateResponse.statusCode, 200);
const nestedUpdateBody = nestedUpdateResponse.json() as { profile: Record<string, unknown> };
assert.equal((nestedUpdateBody.profile.trainingPreferences as Record<string, unknown>).level, "intermediate");
assert.equal(nestedUpdateBody.profile.profilePhotoUrl, "data:image/png;base64,nested");
assert.ok(!("profile" in nestedUpdateBody.profile));

await app.close();
console.log("profile route contract test passed");
