import { describe, expect, it } from "vitest";

import { createAiRequestId, isUuid } from "@/lib/aiRequestId";

describe("aiRequestId", () => {
  it("creates a uuid v4 aiRequestId", () => {
    const id = createAiRequestId();
    expect(isUuid(id)).toBe(true);
  });

  it("rejects non uuid values", () => {
    expect(isUuid("req_123")).toBe(false);
  });
});
