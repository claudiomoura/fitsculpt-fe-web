import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function makeRequest(pathname: string, tokenPayload: Record<string, unknown>) {
  const url = new URL(`http://localhost${pathname}`);
  const request = {
    nextUrl: {
      pathname,
      clone: () => new URL(url),
    },
    cookies: {
      get: (name: string) => (name === "fs_token" ? { value: buildJwt(tokenPayload) } : undefined),
    },
  };

  return request as Parameters<typeof middleware>[0];
}

describe("middleware trainer landing redirects", () => {
  it("sends capability-based trainers from /app to trainer home", () => {
    const response = middleware(makeRequest("/app", { role: "USER", permissions: ["TRAINER_READ"] }));

    expect(response.headers.get("location")).toBe("http://localhost/app/trainer");
  });

  it("keeps users on the athlete home surface", () => {
    const response = middleware(makeRequest("/app/today", { role: "USER" }));

    expect(response.headers.get("location")).toBe("http://localhost/app/hoy");
  });

  it("keeps admins on the admin home surface", () => {
    const response = middleware(makeRequest("/app/hoy", { role: "ADMIN" }));

    expect(response.headers.get("location")).toBe("http://localhost/app/admin");
  });

  it("does not let trainers treat /app/hoy as their landing surface", () => {
    const response = middleware(makeRequest("/app/hoy", { role: "USER", isTrainer: true }));

    expect(response.headers.get("location")).toBe("http://localhost/app/trainer");
  });
});
