import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetPlatform,
  mockGetSdkStatus,
  mockGetPermissionsStatus,
  mockRequestPermissions,
  mockSyncLastDays,
  mockOpenHealthConnectSettings,
} = vi.hoisted(() => ({
  mockGetPlatform: vi.fn(),
  mockGetSdkStatus: vi.fn(),
  mockGetPermissionsStatus: vi.fn(),
  mockRequestPermissions: vi.fn(),
  mockSyncLastDays: vi.fn(),
  mockOpenHealthConnectSettings: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: mockGetPlatform,
  },
  registerPlugin: () => ({
    getSdkStatus: mockGetSdkStatus,
    getPermissionsStatus: mockGetPermissionsStatus,
    requestPermissions: mockRequestPermissions,
    syncLastDays: mockSyncLastDays,
    openHealthConnectSettings: mockOpenHealthConnectSettings,
  }),
}));

import { isAndroidHealthSyncAvailable, syncAndroidHealthSnapshots } from "./nativeHealthSync";

describe("nativeHealthSync", () => {
  beforeEach(() => {
    mockGetPlatform.mockReturnValue("android");
    mockGetSdkStatus.mockResolvedValue({ isAvailable: true, status: "available", sdkStatus: 0 });
    mockGetPermissionsStatus.mockResolvedValue({ granted: true });
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockSyncLastDays.mockResolvedValue({ snapshots: [] });
  });

  it("reports availability for android", () => {
    expect(isAndroidHealthSyncAvailable()).toBe(true);
  });

  it("maps capacitor plugin discovery failures to a stable reason", async () => {
    mockGetSdkStatus.mockRejectedValueOnce(new Error("HealthSync plugin is not implemented on android"));

    const result = await syncAndroidHealthSnapshots(7);

    expect(result).toEqual({
      status: "error",
      reason: "HEALTH_SYNC_PLUGIN_NOT_IMPLEMENTED",
    });
  });

  it("preserves non-discovery error messages", async () => {
    mockGetSdkStatus.mockRejectedValueOnce(new Error("HEALTH_CONNECT_UNAVAILABLE"));

    const result = await syncAndroidHealthSnapshots(7);

    expect(result).toEqual({
      status: "error",
      reason: "HEALTH_CONNECT_UNAVAILABLE",
    });
  });

  it("requests Health Connect permissions before syncing", async () => {
    mockGetPermissionsStatus.mockResolvedValueOnce({ granted: false, reason: "permissions_missing" });

    const result = await syncAndroidHealthSnapshots(7);

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockSyncLastDays).toHaveBeenCalledWith({ days: 7 });
    expect(result).toEqual({ status: "ready", snapshots: [] });
  });

  it("returns a permissions status when the native prompt is denied", async () => {
    mockGetPermissionsStatus.mockResolvedValueOnce({ granted: false, reason: "permissions_missing" });
    mockRequestPermissions.mockResolvedValueOnce({ granted: false, reason: "permissions_denied" });

    const result = await syncAndroidHealthSnapshots(7);

    expect(result).toEqual({
      status: "permissions",
      reason: "permissions_denied",
    });
  });
});
