export const nutritionPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    startDate: { type: ["string", "null"] },

    dailyCalories: { type: "number" },
    proteinG: { type: "number" },
    fatG: { type: "number" },
    carbsG: { type: "number" },

    days: {
      type: "array",
      minItems: 1,
      maxItems: 14,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          dayLabel: { type: "string" },
          meals: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                title: { type: "string" },
                description: { type: ["string", "null"] },

                macros: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fats: { type: "number" },
                  },
                  required: ["calories", "protein", "carbs", "fats"],
                },

                ingredients: {
                  type: ["array", "null"],
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: { type: "string" },
                      grams: { type: "number" },
                    },
                    required: ["name", "grams"],
                  },
                },
              },
              required: ["type", "title", "description", "macros", "ingredients"],
            },
          },
        },
        required: ["date", "dayLabel", "meals"],
      },
    },

    shoppingList: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
        },
        required: ["name", "grams"],
      },
    },
  },
  required: ["title", "startDate", "dailyCalories", "proteinG", "fatG", "carbsG", "days", "shoppingList"],
} as const;
