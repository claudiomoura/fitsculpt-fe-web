export const trainingPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },

        // si no siempre lo quieres, permite null
        notes: { type: ["string", "null"] },
        startDate: { type: ["string", "null"] },

        days: {
          type: "array",
          minItems: 1,
          maxItems: 7,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              // tu Zod pone date nullable, aquí igual
              date: { type: ["string", "null"] },
              label: { type: "string" },
              focus: { type: "string" },
              duration: { type: "number" },
              exercises: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    exerciseId: { type: "string" },
                    name: { type: "string" },
                    sets: { type: "number" },
                    reps: { type: "string" },

                    // como strict obliga a venir siempre, permite null si quieres
                    tempo: { type: ["string", "null"] },
                    rest: { type: ["number", "null"] },
                    notes: { type: ["string", "null"] },
                  },
                  // IMPORTANTE: todas las keys de properties
                  required: ["exerciseId", "name", "sets", "reps", "tempo", "rest", "notes"],
                },
              },
            },
            // ya lo tenías bien, pero ojo que debe incluir todas las keys de properties
            required: ["date", "label", "focus", "duration", "exercises"],
          },
        },
      },
      // IMPORTANTE: todas las keys de properties (title, notes, startDate, days)
      required: ["title", "notes", "startDate", "days"],
    },
  },
  // IMPORTANTE: todas las keys de properties (schema)
  required: ["schema"],
} as const;
