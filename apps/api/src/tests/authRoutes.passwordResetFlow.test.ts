import assert from "node:assert/strict";
import { buildAuthActionUrl, registerAuthRoutes } from "../routes/auth.js";

type ReplyStub = {
  statusCode: number;
  payload: unknown;
  status: (code: number) => ReplyStub;
  send: (payload: unknown) => unknown;
};

function createReplyStub(): ReplyStub {
  return {
    statusCode: 200,
    payload: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return payload;
    },
  };
}

type RouteHandler = (request: unknown, reply: ReplyStub) => Promise<unknown>;

async function main() {
  const routes = new Map<string, RouteHandler>();
  let createdVerificationTokenData: Record<string, unknown> | null = null;

  const appStub = {
    post(path: string, optionsOrHandler: unknown, maybeHandler?: unknown) {
      const handler =
        typeof optionsOrHandler === "function"
          ? (optionsOrHandler as RouteHandler)
          : (maybeHandler as RouteHandler);
      routes.set(`POST ${path}`, handler);
    },
    get(path: string, handler: unknown) {
      routes.set(`GET ${path}`, handler as RouteHandler);
    },
    log: {
      error() {
        return undefined;
      },
    },
  } as const;

  const prismaStub = {
    user: {
      async findUnique() {
        return {
          id: "user_1",
          email: "user@fitsculpt.test",
          deletedAt: null,
          emailVerifiedAt: null,
          passwordHash: "hashed-password",
        };
      },
      async update() {
        return undefined;
      },
    },
    emailVerificationToken: {
      async findFirst() {
        return null;
      },
      async findUnique() {
        return null;
      },
      async create(input: { data: Record<string, unknown> }) {
        createdVerificationTokenData = input.data;
        return { id: "evt_1" };
      },
      async delete() {
        return undefined;
      },
    },
    passwordResetToken: {
      async findFirst() {
        return null;
      },
      async findUnique() {
        return null;
      },
      async create() {
        return { id: "prt_1" };
      },
      async delete() {
        return undefined;
      },
    },
  };

  registerAuthRoutes(appStub as any, {
    prisma: prismaStub,
    app: appStub as any,
    appBaseUrl: "https://fitsculpt.app",
  });

  const resendHandler = routes.get("POST /auth/resend-verification");
  assert.ok(resendHandler, "Expected /auth/resend-verification route to be registered");

  const reply = createReplyStub();
  await resendHandler?.(
    { body: { email: "user@fitsculpt.test" } },
    reply,
  );

  assert.equal(reply.statusCode, 200, "Expected resend verification to return 200");
  assert.deepEqual(reply.payload, { ok: true }, "Expected resend verification success payload");

  assert.ok(createdVerificationTokenData, "Expected verification token to be persisted");
  assert.equal(typeof createdVerificationTokenData?.tokenHash, "string");
  assert.equal((createdVerificationTokenData?.tokenHash as string).length, 64);
  assert.equal("token" in (createdVerificationTokenData ?? {}), false, "Verification token should be stored as tokenHash");

  assert.equal(
    buildAuthActionUrl("https://fitsculpt.app", "/reset-password", "abc=="),
    "https://fitsculpt.app/reset-password?token=abc%3D%3D",
  );
  assert.equal(
    buildAuthActionUrl("https://fitsculpt.app/", "/verify-email", "tok_123"),
    "https://fitsculpt.app/verify-email?token=tok_123",
  );

  const resetHandler = routes.get("POST /auth/reset-password");
  assert.ok(resetHandler, "Expected /auth/reset-password route to be registered");
  const resetReply = createReplyStub();
  await resetHandler?.(
    { body: { token: "unknown-token", password: "new-password-123" } },
    resetReply,
  );
  assert.equal(resetReply.statusCode, 400);
  assert.deepEqual(resetReply.payload, { error: "INVALID_TOKEN" });

  console.log("auth routes password reset flow tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
