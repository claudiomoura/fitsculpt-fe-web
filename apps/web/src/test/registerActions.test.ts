import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

type CookieValue = { value: string };
type CookieStore = {
  get: (name: string) => CookieValue | undefined;
  set: (name: string, value: string) => void;
};

const cookiesMock = vi.fn<() => Promise<CookieStore>>();

vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  return {
    ...actual,
    cookies: cookiesMock,
  };
});

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

function mockJsonResponse(status: number, payload: unknown, setCookies: string[] = []): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    headers: {
      getSetCookie: () => setCookies,
      get: () => null,
    },
  } as unknown as Response;
}

describe("registerAction", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    vi.unstubAllGlobals();

    const cookieJar = new Map<string, string>();
    cookiesMock.mockResolvedValue({
      get: (name) => {
        const value = cookieJar.get(name);
        return value ? { value } : undefined;
      },
      set: (name, value) => {
        cookieJar.set(name, value);
      },
    });
  });

  it("sends onboarding profile draft during signup and keeps PUT /profile as fallback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(201, { id: "user_1" }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          200,
          { ok: true },
          ["fs_token=token_123; Path=/", "fs_token.sig=sig_456; Path=/"]
        )
      )
      .mockResolvedValueOnce(mockJsonResponse(200, { profile: { goal: "maintain" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { registerAction } = await import("@/app/(auth)/login/actions");

    const formData = createFormData({
      email: "new@fitsculpt.test",
      password: "Passw0rd!123",
      name: "New User",
      promoCode: "FitSculpt-100%",
      next: "/app",
      source: "onboarding",
      profileDraft: JSON.stringify({
        profile: {
          goal: "maintain",
          trainingPreferences: {
            daysPerWeek: 4,
          },
        },
      }),
    });

    await expect(registerAction(formData)).rejects.toThrow("REDIRECT:/app");

    const signupRequest = fetchMock.mock.calls[0]?.[1] as { body?: string };
    const signupBody = JSON.parse(signupRequest.body ?? "{}");
    expect(signupBody.profileDraft).toEqual({
      profile: {
        goal: "maintain",
        trainingPreferences: {
          daysPerWeek: 4,
        },
      },
    });

    const profileSyncRequest = fetchMock.mock.calls[2]?.[1] as {
      method?: string;
      headers?: Record<string, string>;
    };
    expect(profileSyncRequest.method).toBe("PUT");
    expect(profileSyncRequest.headers?.cookie).toBe("fs_token=token_123; fs_token.sig=sig_456");
  });

  it("sanitizes empty-string enum placeholders in onboarding draft", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(201, { id: "user_2" }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          200,
          { ok: true },
          ["fs_token=token_abc; Path=/", "fs_token.sig=sig_xyz; Path=/"]
        )
      )
      .mockResolvedValueOnce(mockJsonResponse(200, { profile: { goal: "cut", weightKg: 84 } }));
    vi.stubGlobal("fetch", fetchMock);

    const { registerAction } = await import("@/app/(auth)/login/actions");

    const formData = createFormData({
      email: "sanitize@fitsculpt.test",
      password: "Passw0rd!123",
      name: "Sanitized User",
      promoCode: "FitSculpt-100%",
      next: "/app",
      source: "onboarding",
      profileDraft: JSON.stringify({
        goal: "cut",
        weightKg: 84,
        trainingPreferences: {
          level: "beginner",
          timerSound: "",
        },
        nutritionPreferences: {
          mealDistribution: { preset: "" },
        },
      }),
    });

    await expect(registerAction(formData)).rejects.toThrow("REDIRECT:/app");

    const signupRequest = fetchMock.mock.calls[0]?.[1] as { body?: string };
    const signupBody = JSON.parse(signupRequest.body ?? "{}");
    expect(signupBody.profileDraft).toMatchObject({
      goal: "cut",
      weightKg: 84,
      trainingPreferences: {
        level: "beginner",
      },
    });
    expect(signupBody.profileDraft.trainingPreferences.timerSound).toBeUndefined();
    expect(signupBody.profileDraft.nutritionPreferences).toBeUndefined();
  });
});
