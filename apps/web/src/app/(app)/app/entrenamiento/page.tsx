import TrainingPlanClient from "./TrainingPlanClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TrainingPlanPage() {
  await redirectToOnboardingIfIncomplete("/app/entrenamiento");
  return <TrainingPlanClient mode="suggested" />;
}
