import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInit = vi.fn();
const mockCapture = vi.fn();
const mockIdentify = vi.fn();
const mockReset = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
    identify: mockIdentify,
    reset: mockReset,
  },
}));

describe("analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockReset();
    mockCapture.mockReset();
    mockIdentify.mockReset();
    mockReset.mockReset();
    window.sessionStorage.clear();
    delete window.__fsAnalyticsQueue;
    delete window.posthog;
  });

  it("normalizes the legacy cloud dashboard host to the ingest host", async () => {
    const analytics = await import("@/lib/analytics");

    expect(analytics.resolvePostHogHost(undefined)).toBe("https://us.i.posthog.com");
    expect(analytics.resolvePostHogHost("https://app.posthog.com")).toBe("https://us.i.posthog.com");
    expect(analytics.resolvePostHogHost("https://eu.posthog.com")).toBe("https://eu.i.posthog.com");
    expect(analytics.resolvePostHogHost("https://proxy.example.com/")).toBe("https://proxy.example.com");
  });

  it("initializes PostHog, exposes the browser instance, captures app_opened, and flushes queued events", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://app.posthog.com");
    window.__fsAnalyticsQueue = [{ name: "today_view" }];

    mockInit.mockImplementation((_apiKey, options: { loaded?: () => void }) => {
      options.loaded?.();
    });

    const analytics = await import("@/lib/analytics");
    analytics.initAnalytics();

    expect(window.posthog).toBeDefined();
    expect(mockInit).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        capture_pageview: true,
      })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "app_opened",
      expect.objectContaining({
        path: "/",
      })
    );
    expect(mockCapture).toHaveBeenCalledWith("today_view", {});
    expect(window.__fsAnalyticsQueue).toEqual([]);
    expect(window.sessionStorage.getItem("fs_posthog_boot_event_sent")).toBe("1");
  });
});
