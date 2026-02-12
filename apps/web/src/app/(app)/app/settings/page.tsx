import { Suspense } from "react";

import SettingsClient from "./SettingsClient";
import SettingsFallback from "./SettingsFallback";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsClient />
    </Suspense>
  );
}
