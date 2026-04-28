import { afterEach, describe, expect, it } from "vitest";

import { getBackendUrl } from "./backend";

const originalBackendUrl = process.env.BACKEND_URL;
const originalNextPublicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

function clearBackendEnv() {
  delete process.env.BACKEND_URL;
  delete process.env.NEXT_PUBLIC_BACKEND_URL;
  delete process.env.NEXT_PUBLIC_API_URL;
}

afterEach(() => {
  if (originalBackendUrl === undefined) {
    delete process.env.BACKEND_URL;
  } else {
    process.env.BACKEND_URL = originalBackendUrl;
  }

  if (originalNextPublicBackendUrl === undefined) {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  } else {
    process.env.NEXT_PUBLIC_BACKEND_URL = originalNextPublicBackendUrl;
  }

  if (originalNextPublicApiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
  }
});

describe("getBackendUrl", () => {
  it("uses BACKEND_URL before public env vars", () => {
    clearBackendEnv();
    process.env.NEXT_PUBLIC_API_URL = "https://public-api.example";
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://public-backend.example";
    process.env.BACKEND_URL = "https://private-backend.example";

    expect(getBackendUrl()).toBe("https://private-backend.example");
  });

  it("falls back to NEXT_PUBLIC_API_URL when backend-specific vars are missing", () => {
    clearBackendEnv();
    process.env.NEXT_PUBLIC_API_URL = "https://api-fallback.example";

    expect(getBackendUrl()).toBe("https://api-fallback.example");
  });

  it("defaults to localhost when no env var is set", () => {
    clearBackendEnv();

    expect(getBackendUrl()).toBe("http://localhost:4000");
  });
});
