import { Suspense } from "react";

import BillingClient from "./BillingClient";
import BillingFallback from "./BillingFallback";

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingFallback />}>
      <BillingClient />
    </Suspense>
  );
}
