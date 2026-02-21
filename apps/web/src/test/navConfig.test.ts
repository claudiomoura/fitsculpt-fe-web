import { describe, expect, it } from "vitest";
import { getMostSpecificActiveHref, isPathActive, sidebarUser } from "@/components/layout/navConfig";

describe("navConfig", () => {
  it("marks only exact and nested matches as active", () => {
    expect(isPathActive("/app/biblioteca/entrenamientos", "/app/biblioteca")).toBe(true);
    expect(isPathActive("/app/bibliotecario", "/app/biblioteca")).toBe(false);
  });

  it("prefers the most specific href as active", () => {
    const activeHref = getMostSpecificActiveHref("/app/biblioteca/entrenamientos", sidebarUser);

    expect(activeHref).toBe("/app/biblioteca/entrenamientos");
  });
});
