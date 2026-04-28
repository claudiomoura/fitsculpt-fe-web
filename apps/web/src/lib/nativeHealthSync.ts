import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PassiveHealthSnapshot } from "@/services/tracking";

type HealthSyncPlugin = {
  getSdkStatus: () => Promise<{
    sdkStatus: number;
    isAvailable: boolean;
    status: "available" | "provider_update_required" | "unavailable";
  }>;
  getPermissionsStatus: () => Promise<{
    granted: boolean;
    reason?: string;
  }>;
  requestPermissions: () => Promise<{
    granted: boolean;
    reason?: string;
  }>;
  openHealthConnectSettings: () => Promise<{ opened: boolean; destination: string }>;
  syncLastDays: (options: { days: number }) => Promise<{ snapshots: PassiveHealthSnapshot[] }>;
};

const HealthSync = registerPlugin<HealthSyncPlugin>("HealthSync");

export type NativeHealthSyncResult =
  | { status: "ready"; snapshots: PassiveHealthSnapshot[] }
  | { status: "unsupported"; reason: string }
  | { status: "permissions"; reason: string }
  | { status: "error"; reason: string };

function getErrorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    const message = error.message.trim();
    if (message.includes("not implemented on android")) {
      return "HEALTH_SYNC_PLUGIN_NOT_IMPLEMENTED";
    }
    return message;
  }
  return "UNKNOWN_ERROR";
}

export async function openAndroidHealthConnectSettings(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") {
    return false;
  }

  try {
    const result = await HealthSync.openHealthConnectSettings();
    return Boolean(result?.opened);
  } catch {
    return false;
  }
}

export function isAndroidHealthSyncAvailable(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function syncAndroidHealthSnapshots(days = 30): Promise<NativeHealthSyncResult> {
  if (Capacitor.getPlatform() !== "android") {
    return { status: "unsupported", reason: "ANDROID_ONLY" };
  }

  try {
    const sdk = await HealthSync.getSdkStatus();
    if (!sdk.isAvailable) {
      if (sdk.status === "provider_update_required") {
        return { status: "unsupported", reason: "HEALTH_CONNECT_PROVIDER_UPDATE_REQUIRED" };
      }
      return { status: "unsupported", reason: "HEALTH_CONNECT_UNAVAILABLE" };
    }

    const granted = await HealthSync.getPermissionsStatus();
    if (!granted.granted) {
      const permissionRequest = await HealthSync.requestPermissions();
      if (!permissionRequest.granted) {
        return { status: "permissions", reason: permissionRequest.reason ?? granted.reason ?? "PERMISSIONS_DENIED" };
      }
    }

    const response = await HealthSync.syncLastDays({ days });
    const snapshots = Array.isArray(response?.snapshots) ? response.snapshots : [];
    return { status: "ready", snapshots };
  } catch (error) {
    return { status: "error", reason: getErrorCode(error) };
  }
}
