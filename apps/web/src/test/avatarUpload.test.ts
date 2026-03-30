import { describe, expect, it } from "vitest";
import { estimateDataUrlBytes, fitWithinSquare, pickAvatarCandidate } from "@/lib/avatarUpload";

describe("avatarUpload helpers", () => {
  it("scales images inside max square preserving ratio", () => {
    expect(fitWithinSquare(1600, 900, 512)).toEqual({ width: 512, height: 288 });
    expect(fitWithinSquare(480, 240, 512)).toEqual({ width: 480, height: 240 });
  });

  it("estimates bytes for base64 data urls", () => {
    const payload = "a".repeat(4000);
    const dataUrl = `data:image/jpeg;base64,${payload}`;

    expect(estimateDataUrlBytes(dataUrl)).toBe(3000);
  });

  it("picks the first candidate that fits payload limit", () => {
    const tooLarge = `data:image/webp;base64,${"a".repeat(4000)}`;
    const fits = `data:image/jpeg;base64,${"a".repeat(1000)}`;

    expect(pickAvatarCandidate([tooLarge, fits], 1024)).toBe(fits);
  });

  it("returns null when every candidate exceeds limit", () => {
    const tooLargeA = `data:image/webp;base64,${"a".repeat(4000)}`;
    const tooLargeB = `data:image/jpeg;base64,${"a".repeat(5000)}`;

    expect(pickAvatarCandidate([tooLargeA, tooLargeB], 512)).toBeNull();
  });
});
