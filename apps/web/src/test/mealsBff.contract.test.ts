import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

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
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("Meals BFF contract tests", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  describe("GET /api/meals", () => {
    it("returns meal list with required fields", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            items: [
              {
                id: "meal_1",
                userId: "user_1",
                date: "2026-03-25",
                mealType: "BREAKFAST",
                title: "Oatmeal",
                items: [{ name: "Oats", calories: 300 }],
                calories: 300,
                protein: 10,
                carbs: 50,
                fats: 8,
                completedAt: "2026-03-25T08:00:00.000Z",
                createdAt: "2026-03-25T07:00:00.000Z",
                updatedAt: "2026-03-25T08:00:00.000Z",
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
        ),
      );

      const { GET } = await import("@/app/api/meals/route");
      const response = await GET(new Request("http://localhost/api/meals"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("items");
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items[0]).toMatchObject({
        id: expect.any(String),
        date: expect.any(String),
        mealType: expect.stringMatching(/^(BREAKFAST|LUNCH|DINNER|SNACK)$/),
        title: expect.any(String),
      });
    });

    it("proxies query params to backend", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(200, { items: [], total: 0, limit: 20, offset: 0 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { GET } = await import("@/app/api/meals/route");
      await GET(new Request("http://localhost/api/meals?startDate=2026-03-01&endDate=2026-03-25"));

      expect(fetchMock).toHaveBeenCalledWith(
        "http://backend.local/meals?startDate=2026-03-01&endDate=2026-03-25",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ cookie: "fs_token=token_123" }),
        }),
      );
    });

    it("returns 401 when not authenticated", async () => {
      cookiesMock.mockResolvedValue({
        get: () => undefined,
      });
      
      vi.stubGlobal("fetch", vi.fn());

      const { GET } = await import("@/app/api/meals/route");
      const response = await GET(new Request("http://localhost/api/meals"));

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/meals", () => {
    it("creates meal and returns created meal", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(201, {
            id: "meal_new",
            userId: "user_1",
            date: "2026-03-25",
            mealType: "LUNCH",
            title: "Salad",
            items: [],
            calories: 400,
            protein: 25,
            carbs: 30,
            fats: 15,
            completedAt: null,
            createdAt: "2026-03-25T12:00:00.000Z",
            updatedAt: "2026-03-25T12:00:00.000Z",
          }),
        ),
      );

      const { POST } = await import("@/app/api/meals/route");
      const request = new Request("http://localhost/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-03-25",
          mealType: "LUNCH",
          title: "Salad",
        }),
      });
      
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({
        id: expect.any(String),
        mealType: "LUNCH",
        title: "Salad",
      });
    });

    it("returns 400 for invalid JSON body", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });

      const { POST } = await import("@/app/api/meals/route");
      const request = new Request("http://localhost/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/meals/date/[date]", () => {
    it("returns meals for specific date", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            items: [],
            total: 0,
            date: "2026-03-25",
          }),
        ),
      );

      const { GET } = await import("@/app/api/meals/date/[date]/route");
      const response = await GET(
        new Request("http://localhost/api/meals/date/2026-03-25"),
        { params: Promise.resolve({ date: "2026-03-25" }) },
      );

      expect(response.status).toBe(200);
    });

    it("returns 400 for invalid date format", async () => {
      const { GET } = await import("@/app/api/meals/date/[date]/route");
      const response = await GET(
        new Request("http://localhost/api/meals/date/invalid"),
        { params: Promise.resolve({ date: "invalid" }) },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("INVALID_DATE_FORMAT");
    });
  });

  describe("GET /api/meals/today", () => {
    it("returns today's meal summary", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            totalCalories: 1800,
            totalProtein: 120,
            totalCarbs: 200,
            totalFats: 60,
            mealCount: 3,
            date: "2026-03-25",
          }),
        ),
      );

      const { GET } = await import("@/app/api/meals/today/route");
      const response = await GET(new Request("http://localhost/api/meals/today"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        totalCalories: expect.any(Number),
        totalProtein: expect.any(Number),
        mealCount: expect.any(Number),
        date: expect.any(String),
      });
    });
  });

  describe("PATCH /api/meals/[id]", () => {
    it("updates meal and returns updated meal", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            id: "meal_1",
            title: "Updated Salad",
            completedAt: "2026-03-25T12:30:00.000Z",
          }),
        ),
      );

      const { PATCH } = await import("@/app/api/meals/[id]/route");
      const request = new Request("http://localhost/api/meals/meal_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Salad", completed: true }),
      });
      
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "meal_1" }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/meals/[id]", () => {
    it("deletes meal and returns 204", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new NextResponse(null, { status: 204 }),
        ),
      );

      const { DELETE } = await import("@/app/api/meals/[id]/route");
      const response = await DELETE(
        new Request("http://localhost/api/meals/meal_1"),
        { params: Promise.resolve({ id: "meal_1" }) },
      );

      expect(response.status).toBe(204);
    });
  });

  describe("POST /api/meals/[id]/complete", () => {
    it("marks meal as completed", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            id: "meal_1",
            completedAt: "2026-03-25T12:30:00.000Z",
          }),
        ),
      );

      const { POST } = await import("@/app/api/meals/[id]/complete/route");
      const response = await POST(
        new Request("http://localhost/api/meals/meal_1/complete"),
        { params: Promise.resolve({ id: "meal_1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.completedAt).toBeTruthy();
    });
  });

  describe("POST /api/meals/[id]/uncomplete", () => {
    it("marks meal as not completed", async () => {
      cookiesMock.mockResolvedValue({
        get: () => ({ value: "token_123" }),
      });
      
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            id: "meal_1",
            completedAt: null,
          }),
        ),
      );

      const { POST } = await import("@/app/api/meals/[id]/uncomplete/route");
      const response = await POST(
        new Request("http://localhost/api/meals/meal_1/uncomplete"),
        { params: Promise.resolve({ id: "meal_1" }) },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.completedAt).toBeNull();
    });
  });
});
