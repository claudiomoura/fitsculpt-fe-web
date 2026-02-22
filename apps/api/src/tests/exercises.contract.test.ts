import { normalizeExercisePayload } from "../exercises/normalizeExercisePayload.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const normalizedWithImageUrl = normalizeExercisePayload({
  id: "exercise-1",
  sourceId: null,
  slug: "exercise-1",
  name: "Exercise 1",
  equipment: null,
  imageUrls: [],
  imageUrl: "https://cdn.example.com/exercise-1.jpg",
  description: null,
  mediaUrl: null,
  technique: null,
  tips: null,
  mainMuscleGroup: null,
  secondaryMuscleGroups: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

assert(
  normalizedWithImageUrl.imageUrl === "https://cdn.example.com/exercise-1.jpg",
  "imageUrl should keep Exercise.imageUrl when provided"
);

const normalizedWithFallback = normalizeExercisePayload({
  id: "exercise-2",
  sourceId: null,
  slug: "exercise-2",
  name: "Exercise 2",
  equipment: null,
  imageUrls: ["https://cdn.example.com/exercise-2.jpg"],
  imageUrl: null,
  description: null,
  mediaUrl: null,
  technique: null,
  tips: null,
  mainMuscleGroup: null,
  secondaryMuscleGroups: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

assert(
  normalizedWithFallback.imageUrl === "https://cdn.example.com/exercise-2.jpg",
  "imageUrl should fallback to first imageUrls entry when Exercise.imageUrl is empty"
);

console.log("exercises contract tests passed");
