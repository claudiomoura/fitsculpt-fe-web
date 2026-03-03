import { describe, expect, it } from "vitest";
import { readSessionRole } from "@/lib/auth/sessionRole";

function createUnsignedToken(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

describe("readSessionRole", () => {
  it("returns MANAGER when token includes manager role", () => {
    const token = createUnsignedToken({ role: "manager" });
    expect(readSessionRole(token)).toBe("MANAGER");
  });

  it("returns TRAINER when token includes trainer role", () => {
    const token = createUnsignedToken({ role: "trainer" });
    expect(readSessionRole(token)).toBe("TRAINER");
  });
});
