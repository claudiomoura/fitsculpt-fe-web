export type Goal = "cut" | "maintain" | "bulk";
export type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";
export type Sex = "male" | "female";

export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type TrainingEquipment = "gym" | "home";
export type TrainingFocus = "full" | "upperLower" | "ppl";
export type SessionTime = "short" | "medium" | "long";

export type NutritionCookingTime = "quick" | "medium" | "long";

export type MacroFormula = "mifflin" | "katch";

export type TrainingExercise = {
  name: string;
  sets: string;
  reps?: string;
};

export type TrainingDay = {
  label: string;
  focus: string;
  duration: number;
  exercises: TrainingExercise[];
};

export type TrainingPlanData = {
  title?: string;
  notes?: string;
  days: TrainingDay[];
};

export type NutritionIngredient = {
  name: string;
  grams: number;
};

export type NutritionMeal = {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  description: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients: NutritionIngredient[];
};

export type NutritionDayPlan = {
  dayLabel: string;
  meals: NutritionMeal[];
};

export type NutritionPlanData = {
  title?: string;
  dailyCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  days: NutritionDayPlan[];
  shoppingList?: Array<{ name: string; grams: number }>;
};

export type ProfileData = {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  goal: Goal;
  activity: Activity;
  profilePhotoUrl: string | null;
  avatarDataUrl?: string | null;
  trainingPreferences: {
    goal: Goal;
    level: TrainingLevel;
    daysPerWeek: 2 | 3 | 4 | 5;
    sessionTime: SessionTime;
    focus: TrainingFocus;
    equipment: TrainingEquipment;
  };
  nutritionPreferences: {
    goal: Goal;
    mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
    dietaryPrefs: string;
    dislikes: string;
    cookingTime: NutritionCookingTime;
  };
  macroPreferences: {
    formula: MacroFormula;
    proteinGPerKg: number;
    fatGPerKg: number;
    cutPercent: number;
    bulkPercent: number;
  };
  notes: string;
  measurements: {
    chestCm: number;
    waistCm: number;
    hipsCm: number;
    bicepsCm: number;
    thighCm: number;
    calfCm: number;
    neckCm: number;
    bodyFatPercent: number;
  };
  trainingPlan?: TrainingPlanData | null;
  nutritionPlan?: NutritionPlanData | null;
};

export const defaultProfile: ProfileData = {
  name: "",
  sex: "male",
  age: 30,
  heightCm: 175,
  weightKg: 75,
  goalWeightKg: 70,
  goal: "maintain",
  activity: "moderate",
  profilePhotoUrl: null,
  avatarDataUrl: null,
  trainingPreferences: {
    goal: "maintain",
    level: "beginner",
    daysPerWeek: 3,
    sessionTime: "medium",
    focus: "full",
    equipment: "gym",
  },
  nutritionPreferences: {
    goal: "maintain",
    mealsPerDay: 4,
    dietaryPrefs: "",
    dislikes: "",
    cookingTime: "medium",
  },
  macroPreferences: {
    formula: "mifflin",
    proteinGPerKg: 1.8,
    fatGPerKg: 0.8,
    cutPercent: 15,
    bulkPercent: 10,
  },
  notes: "",
  measurements: {
    chestCm: 0,
    waistCm: 0,
    hipsCm: 0,
    bicepsCm: 0,
    thighCm: 0,
    calfCm: 0,
    neckCm: 0,
    bodyFatPercent: 0,
  },
  trainingPlan: null,
  nutritionPlan: null,
};
