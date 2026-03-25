import { test, expect } from "@playwright/test";
import { createAuthenticatedBrowser, createAuthenticatedPage } from "./support";

test.describe("Meals API E2E", () => {
  let userId: string;
  let mealId: string;
  const testDate = "2026-03-25";

  test.beforeAll(async () => {
    // Create authenticated browser context
    const context = await createAuthenticatedBrowser();
    userId = context.userId;
  });

  test("POST /api/meals creates a meal", async () => {
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.post("/api/meals", {
      data: {
        date: testDate,
        mealType: "BREAKFAST",
        title: "Test Breakfast",
        items: [{ name: "Oats", calories: 300, protein: 10, carbs: 50, fats: 8 }],
        calories: 300,
        protein: 10,
        carbs: 50,
        fats: 8,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      date: testDate,
      mealType: "BREAKFAST",
      title: "Test Breakfast",
    });
    expect(body.id).toBeDefined();
    
    mealId = body.id;
  });

  test("GET /api/meals returns meal list", async () => {
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.get("/api/meals");
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("limit");
    expect(body).toHaveProperty("offset");
  });

  test("GET /api/meals/date/:date returns meals for date", async () => {
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.get(`/api/meals/date/${testDate}`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("date", testDate);
  });

  test("GET /api/meals/today returns summary", async () => {
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.get("/api/meals/today");
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty("totalCalories");
    expect(body).toHaveProperty("totalProtein");
    expect(body).toHaveProperty("totalCarbs");
    expect(body).toHaveProperty("totalFats");
    expect(body).toHaveProperty("mealCount");
    expect(body).toHaveProperty("date");
  });

  test("PATCH /api/meals/:id updates meal", async () => {
    if (!mealId) {
      test.skip();
    }
    
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.patch(`/api/meals/${mealId}`, {
      data: {
        title: "Updated Breakfast",
        completed: true,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("Updated Breakfast");
    expect(body.completedAt).toBeTruthy();
  });

  test("POST /api/meals/:id/complete marks meal completed", async () => {
    if (!mealId) {
      test.skip();
    }
    
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.post(`/api/meals/${mealId}/complete`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.completedAt).toBeTruthy();
  });

  test("POST /api/meals/:id/uncomplete marks meal not completed", async () => {
    if (!mealId) {
      test.skip();
    }
    
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.post(`/api/meals/${mealId}/uncomplete`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.completedAt).toBeNull();
  });

  test("DELETE /api/meals/:id removes meal", async () => {
    if (!mealId) {
      test.skip();
    }
    
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.delete(`/api/meals/${mealId}`);
    expect(response.status()).toBe(204);
  });

  test("invalid date format returns 400", async () => {
    const { page } = await createAuthenticatedPage();
    
    const response = await page.request.get("/api/meals/date/invalid-date");
    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBe("INVALID_DATE_FORMAT");
  });

  test("unauthenticated request returns 401", async () => {
    // Create a context without authentication
    const context = await (await import("@playwright/test")).chromium.launch().then(browser => browser.newContext());
    const page = await context.newPage();
    
    const response = await page.request.get("/api/meals");
    expect(response.status()).toBe(401);
    
    await context.close();
  });
});
