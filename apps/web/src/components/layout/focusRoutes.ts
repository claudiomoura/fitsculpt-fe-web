const WORKOUT_FOCUS_ROUTE = /^\/app\/(entrenamiento|entrenamientos|training)\/[^/]+\/start$/;
const MEAL_LOGGER_FOCUS_ROUTES = new Set([
  "/app/nutricion/editar",
  "/app/nutrition/editar",
  "/app/nutrition/edit",
  "/app/seguimiento/check-in",
]);

export function isFocusRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (WORKOUT_FOCUS_ROUTE.test(pathname)) return true;
  return MEAL_LOGGER_FOCUS_ROUTES.has(pathname);
}
