import { describe, expect, it, vi } from "vitest";
import { analyzeTrackingBodyFatScan } from "@/services/trackingBodyFatScan";

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("tracking body fat scan service", () => {
  it("turns completed zero estimates into retryable failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: "completed",
          summary: "0%",
          estimate: { bodyFatPercent: 0, range: { min: 0, max: 0 } },
          confidence: "high",
          limitations: [],
          nextActions: [],
        }),
      ),
    );

    const result = await analyzeTrackingBodyFatScan({
      frontPhotoDataUrl: "data:image/jpeg;base64,front",
      sidePhotoDataUrl: "data:image/jpeg;base64,side",
      locale: "es",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("failed");
      expect(result.data.failureReason).toBe("invalid_estimate");
      expect(result.data.errorMessage).toMatch(/estimacion valida/i);
    }
  });
});
