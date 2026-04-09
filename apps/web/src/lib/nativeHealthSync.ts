import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PassiveHealthSnapshot } from "@/services/tracking";

type HealthSyncPlugin = {
  getSdkStatus: () => Promise<{ sdkStatus: number; isAvailable: boolean }>;
  requestPermissions: () => Promise<{ granted: boolean }>;
  syncLastDays: (options: { days: number }) => Promise<{ snapshots: PassiveHealthSnapshot[] }>;
};

const HealthSync = registerPlugin<HealthSyncPlugin>("HealthSync");

export type NativeHealthSyncResult =
  | { status: "ready"; snapshots: PassiveHealthSnapshot[] }
  | { status: "unsupported"; reason: string }
  | { status: "permissions"; reason: string };

export async function syncAndroidHealthSnapshots(days = 30): Promise<NativeHealthSyncResult> {
  if (Capacitor.getPlatform() !== "android") {
    return { status: "unsupported", reason: "ANDROID_ONLY" };
  }

  try {
    const sdk = await HealthSync.getSdkStatus();
    if (!sdk.isAvailable) {
      return { status: "unsupported", reason: "HEALTH_CONNECT_UNAVAILABLE" };
    }

    const granted = await HealthSync.requestPermissions();
    if (!granted.granted) {
      return { status: "permissions", reason: "PERMISSIONS_DENIED" };
    }

    const response = await HealthSync.syncLastDays({ days });
    const snapshots = Array.isArray(response?.snapshots) ? response.snapshots : [];
    return { status: "ready", snapshots };
  } catch {
    return { status: "unsupported", reason: "SYNC_FAILED" };
  }
}
