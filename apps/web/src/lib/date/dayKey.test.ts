import { describe, expect, it } from "vitest";

import { dayKey, dayKeyFromDate } from "./dayKey";

describe("dayKey", () => {
  it("preserves YYYY-MM-DD input without timezone parsing", () => {
    expect(dayKey("2026-02-21")).toBe("2026-02-21");
  });

  it("maps timezone-aware strings to a valid day key", () => {
    expect(dayKey("2026-02-20T23:30:00-02:00")).toMatch(/^2026-02-(20|21)$/);
  });

  it("returns null for empty or invalid inputs", () => {
    expect(dayKey()).toBeNull();
    expect(dayKey("   ")).toBeNull();
    expect(dayKey("not-a-date")).toBeNull();
    expect(dayKey(new Date("invalid"))).toBeNull();
  });
});

describe("dayKeyFromDate", () => {
  it("formats Date instances to YYYY-MM-DD", () => {
    expect(dayKeyFromDate(new Date(2026, 1, 21))).toBe("2026-02-21");
  });
});
