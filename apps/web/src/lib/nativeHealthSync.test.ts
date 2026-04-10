import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetPlatform,
  mockGetSdkStatus,
  mockGetPermissionsStatus,
  mockSyncLastDays,
  mockOpenHealthConnectSettings,
} = vi.hoisted(() => ({
  mockGetPlatform: vi.fn(),
  mockGetSdkStatus: vi.fn(),
  mockGetPermissionsStatus: vi.fn(),
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
});
