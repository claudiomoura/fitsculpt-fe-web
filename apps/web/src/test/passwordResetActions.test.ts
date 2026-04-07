import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

function createFormData(values: Record<string, string>) {
  return {
    get(key: string) {
      return values[key] ?? null;
    },
  } as unknown as FormData;
}

describe("auth password reset actions", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("redirects to success when reset-password upstream succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resetPasswordAction } = await import("@/app/(auth)/reset-password/actions");
    const formData = createFormData({
      token: "token_123",
      password: "new-password-123",
      confirmPassword: "new-password-123",
    });

    await expect(resetPasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/reset-password?success=1",
    );

    expect(fetchMock).toHaveBeenCalledWith("http://backend.local/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "token_123", password: "new-password-123" }),
    });
  });

  it("maps invalid reset token to expired route state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "INVALID_TOKEN" }),
      }),
    );

    const { resetPasswordAction } = await import("@/app/(auth)/reset-password/actions");
    const formData = createFormData({
      token: "invalid",
      password: "new-password-123",
      confirmPassword: "new-password-123",
    });

    await expect(resetPasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/reset-password?error=expired",
    );
  });

  it("maps forgot-password rate limit to rate_limited route state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const { forgotPasswordAction } = await import("@/app/(auth)/forgot-password/actions");
    const formData = createFormData({ email: "user@fitsculpt.test" });

    await expect(forgotPasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/forgot-password?error=rate_limited",
    );
  });
});
