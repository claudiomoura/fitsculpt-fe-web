import { describe, expect, it } from "vitest";
import { readSessionRole } from "@/lib/auth/sessionRole";

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("readSessionRole", () => {
  it("reads bootstrap admin tokens as ADMIN when claim role is ADMIN", () => {
    const token = buildJwt({ sub: "u_admin", email: "bootstrap@example.com", role: "ADMIN" });

    expect(readSessionRole(token)).toBe("ADMIN");
  });

  it("reads regular user tokens as USER", () => {
    const token = buildJwt({ sub: "u_user", email: "user@example.com", role: "USER" });

    expect(readSessionRole(token)).toBe("USER");
  });

  it("keeps trainer path unchanged for trainer claims", () => {
    const token = buildJwt({ sub: "u_trainer", email: "trainer@example.com", role: "TRAINER" });

    expect(readSessionRole(token)).toBe("TRAINER");
  });

  it("treats trainer capability claims as TRAINER even when the base role is USER", () => {
    const token = buildJwt({
      sub: "u_trainer_cap",
      email: "trainer@example.com",
      role: "USER",
      permissions: ["TRAINER_READ"],
    });

    expect(readSessionRole(token)).toBe("TRAINER");
  });

  it("keeps admin precedence when admin and trainer claims are both present", () => {
    const token = buildJwt({
      sub: "u_admin",
      email: "admin@example.com",
      role: "USER",
      permissions: ["TRAINER_READ", "ADMIN"],
    });

    expect(readSessionRole(token)).toBe("ADMIN");
  });
});
