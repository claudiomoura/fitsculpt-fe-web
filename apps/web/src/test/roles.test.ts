import { describe, expect, it } from "vitest";
import { getPrimaryRole, getRoleFlags } from "@/lib/roles";

describe("getRoleFlags", () => {
  it("maps backend role enums to capability flags", () => {
    expect(getRoleFlags({ role: "ADMIN" })).toMatchObject({ isAdmin: true, isTrainer: false, isDev: false });
    expect(getRoleFlags({ role: "TRAINER" })).toMatchObject({ isAdmin: false, isTrainer: true, isDev: false });
    expect(getRoleFlags({ role: "ROLE_DEVELOPER" })).toMatchObject({ isAdmin: false, isTrainer: false, isDev: true });
  });

  it("reads nested auth/me payload role fields", () => {
    const profile = { data: { role: "ROLE_ADMIN", permissions: ["TRAINER_READ"] } };
    expect(getRoleFlags(profile)).toMatchObject({ isAdmin: true, isTrainer: true, isDev: false });
  });
});

describe("getPrimaryRole", () => {
  it("returns canonical role from backend role values", () => {
    expect(getPrimaryRole({ role: "ADMIN" })).toBe("admin");
    expect(getPrimaryRole({ role: "ROLE_TRAINER" })).toBe("coach");
    expect(getPrimaryRole({ role: "role_dev" })).toBe("developer");
  });

  it("falls back to user when role is unknown", () => {
    expect(getPrimaryRole({ role: "something_else" })).toBe("user");
  });
});
