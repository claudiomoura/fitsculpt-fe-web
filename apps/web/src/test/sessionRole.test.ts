import { describe, expect, it } from "vitest";
import { readSessionRole } from "@/lib/auth/sessionRole";

function toJwt(payload: Record<string, unknown>) {
  const base64url = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `h.${base64url}.s`;
}

describe("readSessionRole", () => {
  it("maps MANAGER role tokens to trainer access", () => {
    expect(readSessionRole(toJwt({ role: "MANAGER" }))).toBe("TRAINER");
    expect(readSessionRole(toJwt({ role: "ROLE_MANAGER" }))).toBe("TRAINER");
    expect(readSessionRole(toJwt({ roles: ["GYM_MANAGER"] }))).toBe("TRAINER");
  });
});
