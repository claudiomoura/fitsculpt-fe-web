export type FoodProfile = {
  labelKey: string;
  protein: number;
  carbs: number;
  fat: number;
  calories?: number;
};

export const defaultFoodProfiles: Record<string, FoodProfile> = {
  salmon: { labelKey: "tracking.foods.salmon", protein: 20, carbs: 0, fat: 13 },
  eggs: { labelKey: "tracking.foods.eggs", protein: 13, carbs: 1.1, fat: 10 },
  chicken: { labelKey: "tracking.foods.chicken", protein: 31, carbs: 0, fat: 3.6 },
  rice: { labelKey: "tracking.foods.rice", protein: 2.7, carbs: 28, fat: 0.3 },
  quinoa: { labelKey: "tracking.foods.quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
  yogurt: { labelKey: "tracking.foods.yogurt", protein: 10, carbs: 4, fat: 4 },
  potatoes: { labelKey: "tracking.foods.potatoes", protein: 2, carbs: 17, fat: 0.1 },
  avocado: { labelKey: "tracking.foods.avocado", protein: 2, carbs: 9, fat: 15 },
};
