import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { startContractServer } from "./contractTestServer.js";

const testPort = 4313;
const baseUrl = `http://127.0.0.1:${testPort}`;
const prisma = new PrismaClient();

function uniqueValue(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function registerUser(email: string, password: string, name: string) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name,
      promoCode: "FitSculpt-100%",
    }),
  });

  assert.equal(response.status, 201, `Expected register to return 201 for ${email}`);
  return (await response.json()) as { id: string; email: string };
}

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200, `Expected login to return 200 for ${email}`);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Expected auth login to return fs_token cookie");
  return setCookie!.split(";")[0];
}

async function main() {
  const password = "Passw0rd!123";
  const adminEmail = `${uniqueValue("admin")}@example.com`;
  const memberEmail = `${uniqueValue("member")}@example.com`;

  const server = startContractServer({ port: testPort, bootstrapAdminEmails: adminEmail });

  try {
    await server.waitForReady();

    const adminUser = await registerUser(adminEmail, password, "Gym Admin");
    const memberUser = await registerUser(memberEmail, password, "Gym Member");

    await prisma.user.updateMany({
      where: { id: { in: [adminUser.id, memberUser.id] } },
      data: { emailVerifiedAt: new Date() },
    });

    const adminCookie = await login(adminEmail, password);
    const memberCookie = await login(memberEmail, password);

    const gymCode = uniqueValue("gym").slice(0, 20).toUpperCase();
    const createGymResponse = await fetch(`${baseUrl}/admin/gyms`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Join State Gym",
        code: gymCode,
      }),
    });

    assert.equal(createGymResponse.status, 201, `Expected create gym to pass. Logs:\n${server.getLogs()}`);
    const createdGym = (await createGymResponse.json()) as { id: string; activationCode: string };

    const initialMembershipResponse = await fetch(`${baseUrl}/gyms/membership`, {
      headers: { cookie: memberCookie },
    });
    assert.equal(initialMembershipResponse.status, 200);
    const initialMembership = (await initialMembershipResponse.json()) as {
      status: string;
      gymId: string | null;
      role: string | null;
    };
    assert.equal(initialMembership.status, "NONE", "Membership must start in NONE state");
    assert.equal(initialMembership.gymId, null);
    assert.equal(initialMembership.role, null);

    const joinResponse = await fetch(`${baseUrl}/gyms/join`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: memberCookie,
      },
      body: JSON.stringify({ gymId: createdGym.id }),
    });
    assert.equal(joinResponse.status, 200, `Expected join gym request to pass. Logs:\n${server.getLogs()}`);
    const joinPayload = (await joinResponse.json()) as {
      status: string;
      gymId: string | null;
      role: string | null;
    };
    assert.equal(joinPayload.status, "PENDING");
    assert.equal(joinPayload.gymId, createdGym.id);
    assert.equal(joinPayload.role, "MEMBER");

    const persistedPending = await prisma.gymMembership.findFirst({
      where: { userId: memberUser.id, gymId: createdGym.id },
      select: { status: true },
    });
    assert.equal(persistedPending?.status, "PENDING", "Join request must persist PENDING membership state");

    const pendingMembershipResponse = await fetch(`${baseUrl}/gyms/membership`, {
      headers: { cookie: memberCookie },
    });
    assert.equal(pendingMembershipResponse.status, 200);
    const pendingMembership = (await pendingMembershipResponse.json()) as { status: string; gymId: string | null };
    assert.equal(pendingMembership.status, "PENDING");
    assert.equal(pendingMembership.gymId, createdGym.id);

    const leaveResponse = await fetch(`${baseUrl}/gyms/membership`, {
      method: "DELETE",
      headers: { cookie: memberCookie },
    });
    assert.equal(leaveResponse.status, 200);

    const joinByActivationCodeResponse = await fetch(`${baseUrl}/gyms/join-by-code`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: memberCookie,
      },
      body: JSON.stringify({ code: createdGym.activationCode }),
    });
    assert.equal(joinByActivationCodeResponse.status, 200, `Expected join by activation code to pass. Logs:\n${server.getLogs()}`);
    const joinByActivationCodePayload = (await joinByActivationCodeResponse.json()) as {
      status: string;
      gymId: string | null;
      role: string | null;
    };
    assert.equal(joinByActivationCodePayload.status, "ACTIVE");
    assert.equal(joinByActivationCodePayload.gymId, createdGym.id);
    assert.equal(joinByActivationCodePayload.role, "MEMBER");

    const persistedActive = await prisma.gymMembership.findFirst({
      where: { userId: memberUser.id, gymId: createdGym.id },
      select: { status: true },
    });
    assert.equal(persistedActive?.status, "ACTIVE", "Join by activation code must persist ACTIVE membership state");

    const activeMembershipResponse = await fetch(`${baseUrl}/gyms/membership`, {
      headers: { cookie: memberCookie },
    });
    assert.equal(activeMembershipResponse.status, 200);
    const activeMembership = (await activeMembershipResponse.json()) as { status: string; gymId: string | null };
    assert.equal(activeMembership.status, "ACTIVE");
    assert.equal(activeMembership.gymId, createdGym.id);
  } finally {
    await Promise.allSettled([server.stop(), prisma.$disconnect()]);
  }

  console.log("gym join + membership state contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
