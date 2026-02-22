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

  it("supports snake_case media fields from backend payloads", () => {
    const url = getExerciseThumbUrl({
      image_url: "https://cdn/snake-image.jpg",
      thumbnail_url: "https://cdn/snake-thumb.jpg",
      media: { thumbnail_url: "https://cdn/snake-nested-thumb.jpg" },
    });

    expect(url).toBe("https://cdn/snake-image.jpg");
  });

  it("uses first imageUrls entry when imageUrl is missing", () => {
    const url = getExerciseThumbUrl({
      imageUrls: ["", "https://cdn/list-image.jpg"],
      thumbnailUrl: "https://cdn/thumb.jpg",
    });

    expect(url).toBe("https://cdn/list-image.jpg");
  });

  it("supports snake_case image_urls arrays", () => {
    const url = getExerciseThumbUrl({
      image_urls: ["https://cdn/snake-list.jpg"],
    });

    expect(url).toBe("https://cdn/snake-list.jpg");
  });

  it("returns null when no valid media url exists", () => {
    expect(getExerciseThumbUrl({ imageUrl: "  " })).toBeNull();
    expect(getExerciseThumbUrl(null)).toBeNull();
  });
});
