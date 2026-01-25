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

type OptionalEnum<T extends string> = T | "";
type OptionalNumber = number | null;

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
  preset: MealDistributionPreset | "";
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
  startDate?: string | null;
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
  startDate?: string | null;
  dailyCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  days: NutritionDayPlan[];
  shoppingList?: Array<{ name: string; grams: number }>;
};

export type ProfileData = {
  name: string;
  sex: OptionalEnum<Sex>;
  age: OptionalNumber;
  heightCm: OptionalNumber;
  weightKg: OptionalNumber;
  goalWeightKg: OptionalNumber;
  goal: OptionalEnum<Goal>;
  goals: GoalTag[];
  activity: OptionalEnum<Activity>;
  profilePhotoUrl: string | null;
  avatarDataUrl?: string | null;
  injuries: string;
  trainingPreferences: {
    level: OptionalEnum<TrainingLevel>;
    daysPerWeek: OptionalNumber;
    sessionTime: OptionalEnum<SessionTime>;
    focus: OptionalEnum<TrainingFocus>;
    equipment: OptionalEnum<TrainingEquipment>;
    includeCardio: boolean;
    includeMobilityWarmups: boolean;
    workoutLength: OptionalEnum<WorkoutLength>;
    timerSound: OptionalEnum<TimerSound>;
  };
  nutritionPreferences: {
    mealsPerDay: OptionalNumber;
    dietType: OptionalEnum<NutritionDietType>;
    allergies: string[];
    preferredFoods: string;
    dislikedFoods: string;
    dietaryPrefs: string;
    cookingTime: OptionalEnum<NutritionCookingTime>;
    mealDistribution: MealDistribution;
  };
  macroPreferences: {
    formula: OptionalEnum<MacroFormula>;
    proteinGPerKg: OptionalNumber;
    fatGPerKg: OptionalNumber;
    cutPercent: OptionalNumber;
    bulkPercent: OptionalNumber;
  };
  notes: string;
  measurements: {
    chestCm: OptionalNumber;
    waistCm: OptionalNumber;
    hipsCm: OptionalNumber;
    bicepsCm: OptionalNumber;
    thighCm: OptionalNumber;
    calfCm: OptionalNumber;
    neckCm: OptionalNumber;
    bodyFatPercent: OptionalNumber;
  };
  trainingPlan?: TrainingPlanData | null;
  nutritionPlan?: NutritionPlanData | null;
};

export const defaultProfile: ProfileData = {
  name: "",
  sex: "",
  age: null,
  heightCm: null,
  weightKg: null,
  goalWeightKg: null,
  goal: "",
  goals: [],
  activity: "",
  profilePhotoUrl: null,
  avatarDataUrl: null,
  injuries: "",
  trainingPreferences: {
    level: "",
    daysPerWeek: null,
    sessionTime: "",
    focus: "",
    equipment: "",
    includeCardio: true,
    includeMobilityWarmups: true,
    workoutLength: "",
    timerSound: "",
  },
  nutritionPreferences: {
    mealsPerDay: null,
    dietType: "",
    allergies: [],
    preferredFoods: "",
    dislikedFoods: "",
    dietaryPrefs: "",
    cookingTime: "",
    mealDistribution: { preset: "" },
  },
  macroPreferences: {
    formula: "",
    proteinGPerKg: null,
    fatGPerKg: null,
    cutPercent: null,
    bulkPercent: null,
  },
  notes: "",
  measurements: {
    chestCm: null,
    waistCm: null,
    hipsCm: null,
    bicepsCm: null,
    thighCm: null,
    calfCm: null,
    neckCm: null,
    bodyFatPercent: null,
  },
  trainingPlan: null,
  nutritionPlan: null,
};
