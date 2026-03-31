import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://backend.local",
}));

type MockCookieStore = {
  get: (name: string) => { value: string } | undefined;
};

const cookiesMock = vi.fn<() => Promise<MockCookieStore>>();

vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  return {
    ...actual,
    cookies: cookiesMock,
  };
});

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("/api/profile BFF contract", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "token_123" }),
    });
  });

  it("normalizes envelope + legacy root fields to stable profile shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          id: "user_1",
          email: "user@example.com",
          sex: "",
          trainingPreferences: { level: "" },
          profile: {
            sex: "male",
            goal: "maintain",
            trainingPreferences: {
              level: "intermediate",
              daysPerWeek: 4,
            },
          },
        })
      )
    );

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET(new Request("http://localhost/api/profile"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      sex: "male",
      goal: "maintain",
      trainingPreferences: {
        level: "intermediate",
        daysPerWeek: 4,
      },
    });
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("email");
  });

  it("flattens nested profile envelopes on read and write", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          profile: {
            profile: {
              goal: "bulk",
              trainingPreferences: {
                level: "advanced",
              },
              profilePhotoUrl: "data:image/png;base64,fresh",
            },
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          profile: {
            trainingPreferences: {
              level: "advanced",
            },
          },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const { GET, PUT } = await import("@/app/api/profile/route");

    const getResponse = await GET(new Request("http://localhost/api/profile"));
    const getBody = await getResponse.json();

    expect(getBody).toMatchObject({
      goal: "bulk",
      trainingPreferences: {
        level: "advanced",
      },
      profilePhotoUrl: "data:image/png;base64,fresh",
    });

    await PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            profile: {
              trainingPreferences: {
                level: "advanced",
              },
              avatarDataUrl: "data:image/png;base64,fresh",
            },
          },
        }),
      })
    );

    const upstreamRequest = fetchMock.mock.calls[1]?.[1] as { body?: string };
    expect(JSON.parse(upstreamRequest.body ?? "{}")).toEqual({
      trainingPreferences: {
        level: "advanced",
      },
      avatarDataUrl: "data:image/png;base64,fresh",
    });
  });

  it("preserves upstream error status and payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(422, { error: "VALIDATION_ERROR" })));

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ age: -1 }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ error: "VALIDATION_ERROR" });
  });
});
