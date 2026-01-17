import { cookies } from "next/headers";

async function buildCookieHeaderFromStore() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  if (allCookies.length === 0) {
    return { header: null, hasToken: false, hasSignature: false };
  }

  const hasToken = allCookies.some((cookie) => cookie.name === "fs_token");
  const hasSignature = allCookies.some((cookie) => cookie.name === "fs_token.sig");
  if (!hasToken || !hasSignature) {
    return { header: null, hasToken, hasSignature };
  }

  const header = allCookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  return { header, hasToken, hasSignature };
}

function buildCookieHeaderFromRequest(request: Request) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) return null;
  const hasToken = rawCookie.includes("fs_token=");
  const hasSignature = rawCookie.includes("fs_token.sig=");
  return hasToken && hasSignature ? rawCookie : null;
}

export async function getBackendAuthCookie(request: Request) {
  const { header, hasToken, hasSignature } = await buildCookieHeaderFromStore();
  if (header && hasToken && hasSignature) {
    return header;
  }

  const fallback = buildCookieHeaderFromRequest(request);
  if (fallback) {
    return fallback;
  }

  return null;
}
