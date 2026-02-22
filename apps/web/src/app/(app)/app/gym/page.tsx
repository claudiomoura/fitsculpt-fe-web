import GymPageClient from "@/components/gym/GymPageClient";
import { FeatureGate } from "@/components/access/FeatureGate";

export default function GymPage() {
  return (
    <FeatureGate feature="strength" upgradeHref="/pricing">
      <GymPageClient />
    </FeatureGate>
  );
}
