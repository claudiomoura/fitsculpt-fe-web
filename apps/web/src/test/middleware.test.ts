import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function makeRequest(
  pathname: string,
  options?: {
    tokenPayload?: Record<string, unknown>;
    headers?: Record<string, string>;
    search?: string;
  },
) {
  const tokenPayload = options?.tokenPayload;
  const headerMap = new Map<string, string>(
    Object.entries(options?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const url = new URL(`http://localhost${pathname}`);
  if (options?.search) {
    url.search = options.search;
  }

  const request = {
    nextUrl: {
      pathname,
      clone: () => new URL(url),
      searchParams: url.searchParams,
    },
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
    cookies: {
      get: (name: string) => {
        if (name !== "fs_token" || !tokenPayload) return undefined;
        return { value: buildJwt(tokenPayload) };
      },
    },
  };

  return request as Parameters<typeof middleware>[0];
}

describe("middleware trainer landing redirects", () => {
  it("sends capability-based trainers from /app to trainer home", () => {
    const response = middleware(makeRequest("/app", { tokenPayload: { role: "USER", permissions: ["TRAINER_READ"] } }));

    expect(response.headers.get("location")).toBe("http://localhost/app/trainer");
  });

  it("keeps users on the athlete home surface", () => {
    const response = middleware(makeRequest("/app/today", { tokenPayload: { role: "USER" } }));

    expect(response.headers.get("location")).toBe("http://localhost/app/hoy");
  });

  it("keeps admins on the admin home surface", () => {
    const response = middleware(makeRequest("/app/hoy", { tokenPayload: { role: "ADMIN" } }));

    expect(response.headers.get("location")).toBe("http://localhost/app/admin");
  });

  it("does not let trainers treat /app/hoy as their landing surface", () => {
    const response = middleware(makeRequest("/app/hoy", { tokenPayload: { role: "USER", isTrainer: true } }));

    expect(response.headers.get("location")).toBe("http://localhost/app/trainer");
  });

  it("lets trainer paths reach server layout guard when token role is USER", () => {
    const response = middleware(makeRequest("/app/trainer/plans", { tokenPayload: { role: "USER" } }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("lets /app pass through when token only says USER", () => {
    const response = middleware(makeRequest("/app", { tokenPayload: { role: "USER" } }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects capacitor/webview app entry at root to login when no session", () => {
    const response = middleware(makeRequest("/", { headers: { "x-capacitor": "1" } }));

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects fitsculpt native user-agent traffic at root to login when no session", () => {
    const response = middleware(makeRequest("/", { headers: { "user-agent": "FitSculpt/1.0 Android" } }));

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects app entry at root to app when session exists", () => {
    const response = middleware(
      makeRequest("/", {
        tokenPayload: { role: "USER" },
        headers: { "x-requested-with": "com.fitsculpt.beta" },
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost/app");
  });

  it("keeps browser root traffic unchanged", () => {
    const response = middleware(makeRequest("/", { headers: { "user-agent": "Mozilla/5.0" } }));

    expect(response.headers.get("location")).toBeNull();
  });
});
