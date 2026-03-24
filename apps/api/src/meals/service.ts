import { PrismaClient, MealType, MealLog, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateMealLogInput {
  date: string; // ISO date string YYYY-MM-DD
  mealType: MealType;
  title: string;
  items?: Record<string, unknown>[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface UpdateMealLogInput {
  title?: string;
  items?: Record<string, unknown>[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  completedAt?: Date | null;
}

export interface MealLogFilters {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
}

type JsonInput = Prisma.InputJsonValue;

export class MealLogService {
  /**
   * Create a new meal log entry
   */
  async create(userId: string, input: CreateMealLogInput): Promise<MealLog> {
    const date = new Date(input.date);
    
    return prisma.mealLog.create({
      data: {
        userId,
        date,
        mealType: input.mealType,
        title: input.title,
        items: (input.items ?? []) as JsonInput,
        calories: input.calories ?? null,
        protein: input.protein ?? null,
        carbs: input.carbs ?? null,
        fats: input.fats ?? null,
      },
    });
  }

  /**
   * Get a meal log by ID
   */
  async getById(id: string, userId: string): Promise<MealLog | null> {
    return prisma.mealLog.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Get meal logs by date range
   */
  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MealLog[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    return prisma.mealLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [
        { date: "asc" },
        { mealType: "asc" },
      ],
    });
  }

  /**
   * Get meal logs for a specific date
   */
  async getByDate(userId: string, date: string): Promise<MealLog[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.mealLog.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        mealType: "asc",
      },
    });
  }

  /**
   * Get meal logs with optional filters
   */
  async getAll(userId: string, filters?: MealLogFilters): Promise<MealLog[]> {
    const where: Prisma.MealLogWhereInput = {
      userId,
    };

    if (filters?.startDate || filters?.endDate) {
      const start = filters.startDate ? new Date(filters.startDate) : new Date("1970-01-01");
      const end = filters.endDate ? new Date(filters.endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end,
      };
    }

    if (filters?.mealType) {
      where.mealType = filters.mealType;
    }

    return prisma.mealLog.findMany({
      where,
      orderBy: [
        { date: "desc" },
        { mealType: "asc" },
      ],
      take: 100,
    });
  }

  /**
   * Update a meal log
   */
  async update(id: string, userId: string, input: UpdateMealLogInput): Promise<MealLog | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    return prisma.mealLog.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.items !== undefined && { items: input.items as JsonInput }),
        ...(input.calories !== undefined && { calories: input.calories }),
        ...(input.protein !== undefined && { protein: input.protein }),
        ...(input.carbs !== undefined && { carbs: input.carbs }),
        ...(input.fats !== undefined && { fats: input.fats }),
        ...(input.completedAt !== undefined && { completedAt: input.completedAt }),
      },
    });
  }

  /**
   * Mark a meal log as completed
   */
  async complete(id: string, userId: string): Promise<MealLog | null> {
    return this.update(id, userId, { completedAt: new Date() });
  }

  /**
   * Mark a meal log as not completed (undo)
   */
  async uncomplete(id: string, userId: string): Promise<MealLog | null> {
    return this.update(id, userId, { completedAt: null });
  }

  /**
   * Delete a meal log
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.getById(id, userId);
    if (!existing) return false;

    await prisma.mealLog.delete({
      where: { id },
    });
    return true;
  }

  /**
   * Get today's meal summary (calories, protein, carbs, fats)
   */
  async getTodaySummary(userId: string): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    mealCount: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await prisma.mealLog.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const summary = meals.reduce(
      (acc, meal) => ({
        totalCalories: acc.totalCalories + (meal.calories ?? 0),
        totalProtein: acc.totalProtein + (meal.protein ?? 0),
        totalCarbs: acc.totalCarbs + (meal.carbs ?? 0),
        totalFats: acc.totalFats + (meal.fats ?? 0),
        mealCount: acc.mealCount + 1,
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, mealCount: 0 }
    );

    return summary;
  }
}

export const mealLogService = new MealLogService();