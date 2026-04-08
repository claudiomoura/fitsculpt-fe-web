import assert from "node:assert/strict";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import { startContractServer } from "./contractTestServer.js";

const prisma = new PrismaClient();

async function allocatePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate test port")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

function uniqueValue(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  const testPort = await allocatePort();
  const baseUrl = `http://127.0.0.1:${testPort}`;
  const email = `${uniqueValue("profile_draft")}` + "@example.com";
  const password = "Passw0rd!123";

  const server = startContractServer({ port: testPort });

  try {
    await server.waitForReady();

    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: "Profile Draft User",
        promoCode: "FitSculpt-100%",
        profileDraft: {
          profile: {
            goal: "maintain",
            age: 29,
            trainingPreferences: {
              daysPerWeek: 4,
            },
          },
        },
      }),
    });

    assert.equal(response.status, 201, `Expected signup to return 201. Logs:\n${server.getLogs()}`);
    const body = (await response.json()) as { id: string };

    const persistedProfile = await prisma.userProfile.findUnique({
      where: { userId: body.id },
    });

    assert.ok(persistedProfile, "Expected signup to create a userProfile row");
    assert.deepEqual(persistedProfile!.tracking, {}, "Expected tracking to initialize as an object");
    assert.deepEqual(
      persistedProfile!.profile,
      {
        goal: "maintain",
        age: 29,
        trainingPreferences: {
          daysPerWeek: 4,
        },
      },
      "Expected profile draft to persist on signup"
    );
  } finally {
    await Promise.allSettled([server.stop(), prisma.$disconnect()]);
  }

  console.log("signup profile draft contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
