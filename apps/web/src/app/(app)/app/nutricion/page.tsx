import NutritionPlanClient from "./NutritionPlanClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function NutritionPlanPage() {
  await redirectToOnboardingIfIncomplete("/app/nutricion");
  return <NutritionPlanClient />;
}
