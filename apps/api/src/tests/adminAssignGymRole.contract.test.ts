import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { startContractServer } from "./contractTestServer.js";

const testPort = 4312;
const baseUrl = `http://127.0.0.1:${testPort}`;
const prisma = new PrismaClient();

function uniqueValue(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function registerUser(email: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: "Contract Test",
      promoCode: "FitSculpt-100%",
    }),
  });

  assert.equal(response.status, 201, `Expected register to return 201 for ${email}`);
  return (await response.json()) as { id: string; email: string };
}

async function main() {
  const password = "Passw0rd!123";
  const adminEmail = `${uniqueValue("admin")}@example.com`;
  const memberEmail = `${uniqueValue("member")}@example.com`;
  const trainerEmail = `${uniqueValue("trainer")}@example.com`;

  const server = startContractServer({ port: testPort, bootstrapAdminEmails: adminEmail });

  try {
    await server.waitForReady();

    const adminUser = await registerUser(adminEmail, password);
    const memberUser = await registerUser(memberEmail, password);
    const trainerUser = await registerUser(trainerEmail, password);

    await prisma.user.updateMany({
      where: { id: { in: [adminUser.id, memberUser.id, trainerUser.id] } },
      data: { emailVerifiedAt: new Date() },
    });

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password }),
    });

    assert.equal(loginResponse.status, 200, "Expected admin login to pass");
    const cookieHeader = loginResponse.headers.get("set-cookie");
    assert.ok(cookieHeader, "Expected auth login to return fs_token cookie");
    const authCookie = cookieHeader!.split(";")[0];

    const gymCode = uniqueValue("gym").slice(0, 20).toUpperCase();
    const createGymResponse = await fetch(`${baseUrl}/admin/gyms`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ name: "Role Assignment Gym", code: gymCode }),
    });

    assert.equal(createGymResponse.status, 201, `Expected create gym to pass. Logs:\n${server.getLogs()}`);
    const createdGym = (await createGymResponse.json()) as { id: string };

    const assignClientResponse = await fetch(`${baseUrl}/admin/gyms/${createdGym.id}/users/${memberUser.id}/assign-role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ role: "CLIENT" }),
    });

    assert.equal(assignClientResponse.status, 200, "Expected assigning CLIENT role to pass");
    const assignClientPayload = (await assignClientResponse.json()) as {
      userId: string;
      gymId: string;
      role: string;
      status: string;
    };
    assert.equal(assignClientPayload.userId, memberUser.id);
    assert.equal(assignClientPayload.gymId, createdGym.id);
    assert.equal(assignClientPayload.role, "MEMBER");
    assert.equal(assignClientPayload.status, "ACTIVE");

    const assignTrainerResponse = await fetch(`${baseUrl}/admin/users/${trainerUser.id}/assign-gym-role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ gymId: createdGym.id, role: "TRAINER" }),
    });

    assert.equal(assignTrainerResponse.status, 200, "Expected assigning TRAINER role to pass");
    const assignTrainerPayload = (await assignTrainerResponse.json()) as { role: string; status: string };
    assert.equal(assignTrainerPayload.role, "TRAINER");
    assert.equal(assignTrainerPayload.status, "ACTIVE");

    const invalidRoleResponse = await fetch(`${baseUrl}/admin/gyms/${createdGym.id}/users/${memberUser.id}/assign-role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ role: "ADMIN" }),
    });

    assert.equal(invalidRoleResponse.status, 400, "Expected invalid role to return 400");
    const invalidRolePayload = (await invalidRoleResponse.json()) as { error?: string };
    assert.equal(invalidRolePayload.error, "INVALID_INPUT");

    const missingGymResponse = await fetch(`${baseUrl}/admin/users/${memberUser.id}/assign-gym-role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ gymId: "gym_does_not_exist", role: "CLIENT" }),
    });

    assert.equal(missingGymResponse.status, 404, "Expected unknown gym to return 404");
    const missingGymPayload = (await missingGymResponse.json()) as { error?: string };
    assert.equal(missingGymPayload.error, "GYM_NOT_FOUND");

    const secondGymCode = uniqueValue("gym").slice(0, 20).toUpperCase();
    const secondGymResponse = await fetch(`${baseUrl}/admin/gyms`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ name: "Conflict Gym", code: secondGymCode }),
    });
    assert.equal(secondGymResponse.status, 201, "Expected second gym creation to pass");
    const secondGym = (await secondGymResponse.json()) as { id: string };

    const conflictResponse = await fetch(`${baseUrl}/admin/gyms/${secondGym.id}/users/${memberUser.id}/assign-role`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify({ role: "TRAINER" }),
    });

    assert.equal(conflictResponse.status, 409, "Expected active membership conflict to return 409");
    const conflictPayload = (await conflictResponse.json()) as { error?: string };
    assert.equal(conflictPayload.error, "GYM_MEMBERSHIP_CONFLICT");
  } finally {
    await Promise.allSettled([server.stop(), prisma.$disconnect()]);
  }

  console.log("admin assign gym role contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
