export function normalizeExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"'¿?¡!<>\\|+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
