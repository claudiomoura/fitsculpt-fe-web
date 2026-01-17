import { cookies } from "next/headers";

function buildCookieHeaderFromStore() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  if (allCookies.length === 0) {
    return { header: null, hasToken: false };
  }

  const header = allCookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  const hasToken = allCookies.some((cookie) => cookie.name === "fs_token");
  return { header, hasToken };
}

function buildCookieHeaderFromRequest(request: Request) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) return null;
  const hasToken = rawCookie.includes("fs_token=");
  const hasSignature = rawCookie.includes("fs_token.sig=");
  return hasToken && hasSignature ? rawCookie : null;
}

export function getBackendAuthCookie(request: Request) {
  const { header, hasToken } = buildCookieHeaderFromStore();
  if (hasToken && header) {
    return header;
  }

  if (!hasToken) {
    const fallback = buildCookieHeaderFromRequest(request);
    if (fallback) {
      return fallback;
    }
  }

  return null;
}
