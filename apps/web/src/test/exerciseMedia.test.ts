import { describe, expect, it } from "vitest";
import { getExerciseThumbUrl } from "@/lib/exerciseMedia";

describe("getExerciseThumbUrl", () => {
  it("returns first available media field", () => {
    const url = getExerciseThumbUrl({
      imageUrl: "",
      thumbnailUrl: "https://cdn/thumb.jpg",
      mediaUrl: "https://cdn/media.mp4",
    });

    expect(url).toBe("https://cdn/thumb.jpg");
  });

  it("falls back to nested media urls", () => {
    const url = getExerciseThumbUrl({
      media: { thumbnailUrl: "", url: "https://cdn/media.gif" },
    });

    expect(url).toBe("https://cdn/media.gif");
  });

  it("returns null when no valid media url exists", () => {
    expect(getExerciseThumbUrl({ imageUrl: "  " })).toBeNull();
    expect(getExerciseThumbUrl(null)).toBeNull();
  });
});
