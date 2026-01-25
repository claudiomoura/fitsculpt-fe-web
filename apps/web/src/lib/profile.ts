export type Goal = "cut" | "maintain" | "bulk";
export type Activity = "sedentary" | "light" | "moderate" | "very" | "extra";
export type Sex = "male" | "female";

export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type TrainingEquipment = "gym" | "home";
export type TrainingFocus = "full" | "upperLower" | "ppl";
export type SessionTime = "short" | "medium" | "long";
export type WorkoutLength = "30m" | "45m" | "60m" | "flexible";
export type TimerSound = "ding" | "repsToDo";

export type GoalTag = "buildStrength" | "loseFat" | "betterHealth" | "moreEnergy" | "tonedMuscles";

export type NutritionCookingTime = "quick" | "medium" | "long";
export type NutritionDietType =
  | "balanced"
  | "mediterranean"
  | "keto"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "paleo"
  | "flexible";
export type MealDistributionPreset = "balanced" | "lightDinner" | "bigBreakfast" | "bigLunch" | "custom";
export type MealDistribution = {
  preset: MealDistributionPreset;
  percentages?: number[];
};

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
  description?: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  ingredients?: NutritionIngredient[];
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
  goals: GoalTag[];
  activity: Activity;
  profilePhotoUrl: string | null;
  avatarDataUrl?: string | null;
  injuries: string;
  trainingPreferences: {
    level: TrainingLevel;
    daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    sessionTime: SessionTime;
    focus: TrainingFocus;
    equipment: TrainingEquipment;
    includeCardio: boolean;
    includeMobilityWarmups: boolean;
    workoutLength: WorkoutLength;
    timerSound: TimerSound;
  };
  nutritionPreferences: {
    mealsPerDay: 1 | 2 | 3 | 4 | 5 | 6;
    dietType: NutritionDietType;
    allergies: string[];
    preferredFoods: string;
    dislikedFoods: string;
    dietaryPrefs: string;
    cookingTime: NutritionCookingTime;
    mealDistribution: MealDistribution;
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
  goals: ["betterHealth"],
  activity: "moderate",
  profilePhotoUrl: null,
  avatarDataUrl: null,
  injuries: "",
  trainingPreferences: {
    level: "beginner",
    daysPerWeek: 3,
    sessionTime: "medium",
    focus: "full",
    equipment: "gym",
    includeCardio: true,
    includeMobilityWarmups: true,
    workoutLength: "45m",
    timerSound: "ding",
  },
  nutritionPreferences: {
    mealsPerDay: 4,
    dietType: "balanced",
    allergies: [],
    preferredFoods: "",
    dislikedFoods: "",
    dietaryPrefs: "",
    cookingTime: "medium",
    mealDistribution: { preset: "balanced" },
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
