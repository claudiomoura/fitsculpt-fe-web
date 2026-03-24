const API_BASE = "/meals";

export type MealItem = {
  name?: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
};

export type MealLogResponse = {
  id: string;
  userId: string;
  date: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  title: string;
  items: MealItem[];
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface CreateMealParams {
  date: string; // YYYY-MM-DD
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  title: string;
  items?: MealItem[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface UpdateMealParams {
  title?: string;
  items?: MealItem[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  completed?: boolean;
}

export interface MealListResponse {
  items: MealLogResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface TodaySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealCount: number;
  date: string;
}

/**
 * Create a new meal log
 */
export async function createMealLog(params: CreateMealParams): Promise<MealLogResponse> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Failed to create meal: ${response.status}`);
  }

  return response.json();
}

/**
 * Get meal logs with optional filters
 */
export async function getMealLogs(params?: {
  startDate?: string;
  endDate?: string;
  mealType?: string;
  limit?: number;
  offset?: number;
}): Promise<MealListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.mealType) searchParams.set("mealType", params.mealType);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const url = searchParams.toString() ? `${API_BASE}?${searchParams.toString()}` : API_BASE;
  
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to get meals: ${response.status}`);
  }

  return response.json();
}

/**
 * Get meal logs for a specific date
 */
export async function getMealsByDate(date: string): Promise<MealListResponse> {
  const response = await fetch(`${API_BASE}/date/${date}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to get meals for date: ${response.status}`);
  }

  return response.json();
}

/**
 * Get today's meal summary (calories, protein, carbs, fats)
 */
export async function getTodaySummary(): Promise<TodaySummary> {
  const response = await fetch(`${API_BASE}/today`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to get today's summary: ${response.status}`);
  }

  return response.json();
}

/**
 * Update a meal log
 */
export async function updateMealLog(id: string, params: UpdateMealParams): Promise<MealLogResponse> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Failed to update meal: ${response.status}`);
  }

  return response.json();
}

/**
 * Mark a meal as completed
 */
export async function completeMeal(id: string): Promise<MealLogResponse> {
  const response = await fetch(`${API_BASE}/${id}/complete`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to complete meal: ${response.status}`);
  }

  return response.json();
}

/**
 * Mark a meal as not completed (undo)
 */
export async function uncompleteMeal(id: string): Promise<MealLogResponse> {
  const response = await fetch(`${API_BASE}/${id}/uncomplete`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to uncomplete meal: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a meal log
 */
export async function deleteMealLog(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete meal: ${response.status}`);
  }
}