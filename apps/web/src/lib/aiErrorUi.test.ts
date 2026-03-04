import { describe, expect, it } from "vitest";

import { mapAiErrorToUiState } from "./aiErrorUi";

const t = (key: string) => key;

describe("mapAiErrorToUiState", () => {
  it("maps quota errors to billing CTA", () => {
    const state = mapAiErrorToUiState({ kind: "quota", code: "AI_QUOTA_EXCEEDED" }, t);
    expect(state.description).toBe("ai.quotaUnavailable");
    expect(state.ctaHref).toBe("/app/settings/billing");
  });

  it("maps auth errors to login CTA", () => {
    const state = mapAiErrorToUiState({ kind: "auth", status: 401 }, t);
    expect(state.description).toBe("ai.authUnavailable");
    expect(state.ctaHref).toBe("/login");
  });

  it("maps validation errors to review data copy", () => {
    const state = mapAiErrorToUiState({ kind: "validation", status: 400 }, t);
    expect(state.description).toBe("ai.validationUnavailable");
    expect(state.ctaHref).toBeNull();
  });

  it("maps unknown/upstream errors to service unavailable", () => {
    const upstream = mapAiErrorToUiState({ kind: "upstream", status: 502 }, t);
    const unknown = mapAiErrorToUiState({ kind: "unknown", status: 520 }, t);
    expect(upstream.description).toBe("ai.serviceUnavailable");
    expect(unknown.description).toBe("ai.serviceUnavailable");
  });
});
