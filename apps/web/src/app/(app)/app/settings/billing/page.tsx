import { Suspense } from "react";

import BillingClient from "./BillingClient";

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando facturación...</p>}>
      <BillingClient />
    </Suspense>
  );
}
