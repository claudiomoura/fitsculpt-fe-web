import { redirect } from "next/navigation";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function BodyScanPage() {
  await redirectToOnboardingIfIncomplete("/app/seguimiento/body-scan");
  redirect("/app/body-scan");
}
